import bcrypt from "bcryptjs";
import { GraphQLError } from "graphql";
import { signToken } from "../auth.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Contact from "../models/Contact.js";

const requireAuth = (ctx) => {
  if (!ctx.user)
    throw new GraphQLError("Not authenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
};

function requireAdmin(ctx) {
  requireAuth(ctx);
  if (ctx.user.role !== "ADMIN") {
    throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
  }
}

// function requireAdmin(ctx) {
//   if (!ctx.user || ctx.user.role !== "ADMIN") {
//     throw new GraphQLError("Not authorized");
//   }
// }

function nightsBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export const resolvers = {
  Query: {
    me: async (_, __, ctx) => {
      requireAuth(ctx);
      return User.findById(ctx.user.id);
    },

    rooms: async (_, { activeOnly }) => {
      const q = activeOnly ? { isActive: true } : {};
      return await Room.find(q).sort({ number: 1 });
    },

    room: async (_, { id }) => {
      return await Room.findById(id);
    },
    roomBookingCount: async (_, { id }) => {
      return await Booking.countDocuments({ room: id, status: "CONFIRMED" });
    },
    myBookings: async (_, __, ctx) => {
      requireAuth(ctx);
      return Booking.find({ user: ctx.user.id })
        .populate("room")
        .populate("user");
    },
    bookings: async (_, __, ctx) => {
      requireAdmin(ctx);
      return await Booking.find().populate("room").populate("user");
    },
    getContacts: async () => {
      return await Contact.find().sort({ createdAt: -1 });
    },
    getReviews: async (_, { roomId }) => {
      const room = await Room.findById(roomId).populate("reviews.user");
      if (!room) throw new Error("Room not found");

      return room.reviews;
    },
  },

  Room: {
    bookingCount: async (parent) => {
      return await Booking.countDocuments({
        room: parent._id,
        status: "CONFIRMED",
      });
    },
  },

  Mutation: {
    register: async (_, { input }, ctx) => {
      const exists = await User.findOne({ email: input.email });
      if (exists) throw new GraphQLError("Email already in use");
      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await User.create({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      });
      const token = signToken(
        { id: user.id, role: user.role },
        ctx.config.JWT_SECRET,
        {
          expiresIn: ctx.config.JWT_EXPIRES_IN,
        }
      );
      return { token, user };
    },

    login: async (_, { input }, ctx) => {
      const user = await User.findOne({ email: input.email });
      if (!user) throw new GraphQLError("Invalid credentials");
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw new GraphQLError("Invalid credentials");
      const token = signToken(
        { id: user.id, role: user.role },
        ctx.config.JWT_SECRET,
        {
          expiresIn: ctx.config.JWT_EXPIRES_IN,
        }
      );
      return { token, user };
    },

    createRoom: async (_, { input }, ctx) => {
      requireAdmin(ctx);
      return Room.create(input);
    },

    updateRoom: async (_, { id, input }, ctx) => {
      requireAdmin(ctx);
      return Room.findByIdAndUpdate(id, input, { new: true });
    },

    toggleRoomActive: async (_, { id, isActive }, ctx) => {
      requireAdmin(ctx);
      return Room.findByIdAndUpdate(id, { isActive }, { new: true });
    },

    bookRoom: async (_, { input }, ctx) => {
      requireAuth(ctx);
      const room = await Room.findById(input.roomId);
      if (!room || !room.isActive) throw new GraphQLError("Room not available");

      const nights = nightsBetween(input.checkIn, input.checkOut);
      if (nights <= 0) throw new GraphQLError("Invalid dates");

      const overlapping = await Booking.findOne({
        room: room._id,
        status: "CONFIRMED",
        $or: [
          {
            checkIn: { $lt: input.checkOut },
            checkOut: { $gt: input.checkIn },
          }, // overlap
        ],
      });

      if (overlapping)
        throw new GraphQLError("Room already booked for those dates");

      const totalPrice = nights * room.pricePerNight;

      const booking = await Booking.create({
        user: ctx.user.id,
        room: room._id,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests ?? 1,
        totalPrice,
      });

      // Populate room + user so GraphQL resolves fields properly
      await booking.populate("room");
      await booking.populate("user");

      // Convert `_id` and any referenced ObjectId to strings
      return {
        ...booking.toObject(),
        id: booking._id.toString(),
        room: {
          ...booking.room.toObject(),
          id: booking.room._id.toString(),
        },
        user: {
          ...booking.user.toObject(),
          id: booking.user._id.toString(),
        },
      };
    },

    cancelBooking: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const b = await Booking.findById(id);
      if (!b) throw new GraphQLError("Booking not found");
      // allow user or admin
      if (String(b.user) !== ctx.user.id && ctx.user.role !== "ADMIN")
        throw new GraphQLError("Forbidden");
      b.status = "CANCELLED";
      await b.save();
      return b;
    },

    deleteRoom: async (_, { id }, ctx) => {
      requireAdmin(ctx);
      const room = await Room.findByIdAndDelete(id);
      return {
        status: room ? "SUCCESS" : "ERROR",
        message: room ? "Room deleted successfully" : "Room not found",
        roomId: room?._id,
      };
    },

    submitReview: async (_, { input }, ctx) => {
      requireAuth(ctx);
      const booking = await Booking.findById(input.bookingId);
      if (!booking) throw new GraphQLError("Booking not found");
      if (String(booking.user) !== ctx.user.id)
        throw new GraphQLError("Forbidden");
      if (booking.review)
        throw new GraphQLError("Review already submitted for this booking");
      const review = {
        rating: input.rating,
        comment: input.comment,
      };
      booking.review = review;
      await booking.save();
      return review;
    },
    submitContact: async (_, { input }) => {
      // No authentication required for contact submissions
      const contact = await Contact.create({
        name: input.name,
        email: input.email,
        message: input.message,
      });
      return contact;
    },

    addReview: async (_, { input }, ctx) => {
      requireAuth(ctx);
      const booking = await Booking.findById(input.bookingId).populate("room");
      if (!booking) throw new GraphQLError("Booking not found");
      if (String(booking.user) !== ctx.user.id)
        throw new GraphQLError("Forbidden");
      if (booking.review)
        throw new GraphQLError("Review already submitted for this booking");
      const review = {
        rating: input.rating,
        comment: input.comment,
      };
      booking.review = review;
      await booking.save();
      // Update Room's averageRating and totalReviews
      const room = await Room.findById(booking.room._id);
      room.reviews.push({ ...review, user: ctx.user.id });
      room.totalReviews = room.reviews.length;
      room.averageRating =
        room.reviews.reduce((sum, r) => sum + r.rating, 0) / room.totalReviews;
      await room.save();
      return review;
    },
  },

  // Booking: {
  //   user: (b) => User.findById(b.user),
  //   room: (b) => Room.findById(b.room),
  // },
};
