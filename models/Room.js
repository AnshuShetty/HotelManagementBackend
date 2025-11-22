// src/models/Room.js
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
    type: { type: String, enum: ["Single", "Double", "Suite"], required: true },
    pricePerNight: { type: Number, required: true },
    amenities: [{ type: String }],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
