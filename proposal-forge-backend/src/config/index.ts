import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/proposal-forge",
  jwtSecret: process.env.JWT_SECRET ?? "your-secret-key-here",
  openaiApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  /** Optional: override Gemini model (e.g. "gemini-2.0-flash"). If unset, multiple IDs are tried. */
  geminiModel: process.env.GEMINI_MODEL,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("MongoDB connected");
  } catch (err) {
    console.warn("MongoDB connection failed (running without DB):", (err as Error).message);
  }
}
