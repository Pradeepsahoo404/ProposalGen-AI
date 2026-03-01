import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { config } from "../config/index";
import { sendPasswordResetEmail } from "./emailService";

const SALT_ROUNDS = 10;
const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export async function register(email: string, password: string) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email: email.toLowerCase(),
    password: passwordHash,
    role: "sales",
  });

  const role = (user as { role?: string }).role ?? "sales";
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: { id: user._id.toString(), email: user.email, role },
  };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("Invalid email or password");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid email or password");

  const role = (user as { role?: string }).role ?? "sales";
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: { id: user._id.toString(), email: user.email, role },
  };
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string; email: string; role?: string };
    return { id: decoded.userId, email: decoded.email, role: decoded.role ?? "sales" };
  } catch {
    return null;
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return; // Do not reveal whether email exists
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const expires = new Date(Date.now() + RESET_EXPIRY_MS);
  (user as { resetPasswordToken?: string; resetPasswordExpires?: Date }).resetPasswordToken = token;
  (user as { resetPasswordToken?: string; resetPasswordExpires?: Date }).resetPasswordExpires = expires;
  await user.save();
  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new Error("Invalid or expired reset link");
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.password = hash;
  (user as { resetPasswordToken?: string | null; resetPasswordExpires?: Date | null }).resetPasswordToken = null;
  (user as { resetPasswordToken?: string | null; resetPasswordExpires?: Date | null }).resetPasswordExpires = null;
  await user.save();
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw new Error("Current password is incorrect");
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.password = hash;
  await user.save();
}
