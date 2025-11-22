import bcrypt from "bcryptjs";
import { GraphQLError } from "graphql";
import { signToken } from "../auth.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";

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
      return Room.find(q).sort({ number: 1 });
    },
    room: async (_, { id }) => {
      return await Room.findById(id);
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

      return Booking.create({
        user: ctx.user.id,
        room: room._id,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests ?? 1,
        totalPrice,
      });
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
  },

  // Booking: {
  //   user: (b) => User.findById(b.user),
  //   room: (b) => Room.findById(b.room),
  // },
};
