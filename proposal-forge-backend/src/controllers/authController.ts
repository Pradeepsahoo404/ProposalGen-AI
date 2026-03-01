import { Request, Response } from "express";
import * as authService from "../services/authService";
import User from "../models/User";

export async function signup(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const result = await authService.register(email, password);
    return res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return res.status(400).json({ error: message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const result = await authService.login(email, password);
    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return res.status(401).json({ error: message });
  }
}

export async function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const doc = await User.findById(req.user.id).select("email role settings").lean();
  if (!doc) return res.status(401).json({ error: "User not found" });
  return res.json({
    user: {
      id: req.user.id,
      email: doc.email,
      role: doc.role,
      settings: (doc as { settings?: Record<string, unknown> }).settings ?? {},
    },
  });
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email required" });
    }
    await authService.forgotPassword(email.trim());
    return res.json({ message: "If an account exists with this email, you will receive a reset link shortly." });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    await authService.resetPassword(token, password);
    return res.json({ message: "Password has been reset. You can now sign in." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reset failed";
    return res.status(400).json({ error: message });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }
    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "New password is required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to change password";
    return res.status(400).json({ error: message });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    const current = (user as { settings?: Record<string, unknown> }).settings ?? {};
    const updates = req.body && typeof req.body === "object" ? req.body : {};
    const allowed = ["logoUrl", "companyName", "termsTemplate", "pricingDefaults"];
    const next: Record<string, unknown> = { ...current };
    for (const key of allowed) {
      if (key in updates) {
        const v = updates[key];
        if (key === "pricingDefaults" && v && typeof v === "object") {
          next[key] = v;
        } else if (key === "logoUrl" || key === "companyName" || key === "termsTemplate") {
          next[key] = typeof v === "string" ? v : v == null ? "" : String(v);
        }
      }
    }
    (user as { settings?: Record<string, unknown> }).settings = next;
    await user.save();

    return res.json({
      user: {
        id: req.user.id,
        email: user.email,
        role: user.role,
        settings: next,
      },
    });
  } catch (err) {
    console.error("updateSettings", err);
    return res.status(500).json({ error: "Failed to save settings" });
  }
}
