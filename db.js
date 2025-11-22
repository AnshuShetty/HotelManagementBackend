import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    console.error("❌ MongoDB URI is missing!");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
