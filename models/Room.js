// src/models/Room.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const roomSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    type: { type: String, enum: ["Single", "Double", "Suite"], required: true },
    pricePerNight: { type: Number, required: true },
    amenities: [{ type: String }],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    reviews: [reviewSchema],
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
