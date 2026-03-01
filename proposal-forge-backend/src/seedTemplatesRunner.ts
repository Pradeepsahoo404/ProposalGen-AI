/**
 * Run templates seed only. Requires MongoDB and MONGODB_URI in .env.
 * Usage: npm run seed:templates
 */

import { connectDB } from "./config";
import { seedTemplates } from "./seedTemplates";
import mongoose from "mongoose";

async function run() {
  await connectDB();
  await seedTemplates();
  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error("seed:templates failed:", err);
  process.exit(1);
});
