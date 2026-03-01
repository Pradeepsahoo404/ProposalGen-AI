import { Request, Response } from "express";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const ALLOWED_EXT = [".pdf", ".docx", ".txt"];
const LOGO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const LOGO_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

function getMimeFromName(name: string): string {
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".txt") return "text/plain";
  return "";
}

export async function uploadFile(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const file = req.files?.file as { data?: Buffer; name?: string; size?: number; mimetype?: string } | undefined;
    if (!file || Array.isArray(file)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = file.data;
    if (!buffer) return res.status(400).json({ error: "No file data" });

    const name = file.name ?? "document";
    const size = file.size ?? 0;
    const mimetype = file.mimetype ?? getMimeFromName(name);

    if (size > MAX_SIZE) {
      return res.status(400).json({ error: "File too large (max 20MB)" });
    }

    const ext = name.toLowerCase().slice(name.lastIndexOf("."));
    if (!ALLOWED_EXT.includes(ext) || !ALLOWED_TYPES.includes(mimetype)) {
      return res.status(400).json({ error: "Invalid file type. Use PDF, DOCX, or TXT." });
    }

    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      return res.status(503).json({ error: "Upload not configured (Cloudinary)" });
    }

    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    const stream = Readable.from(buffer);
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "proposal-forge", resource_type: "auto" },
        (err, result) => {
          if (err) reject(err);
          else if (result?.secure_url) resolve(result);
          else reject(new Error("No URL returned"));
        }
      );
      stream.pipe(uploadStream);
    });

    return res.json({ url: result.secure_url, fileName: name });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}

export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const file = req.files?.file as { data?: Buffer; name?: string; size?: number; mimetype?: string } | undefined;
    if (!file || Array.isArray(file)) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = file.data;
    if (!buffer) return res.status(400).json({ error: "No file data" });

    const name = file.name ?? "logo";
    const size = file.size ?? 0;
    const mimetype = file.mimetype ?? "";

    if (size > MAX_LOGO_SIZE) {
      return res.status(400).json({ error: "Logo too large (max 2MB)" });
    }

    const ext = name.toLowerCase().slice(name.lastIndexOf("."));
    if (!LOGO_EXT.includes(ext) || !LOGO_TYPES.includes(mimetype)) {
      return res.status(400).json({ error: "Invalid file type. Use JPG, PNG, GIF, or WebP." });
    }

    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      return res.status(503).json({ error: "Upload not configured (Cloudinary)" });
    }

    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    const stream = Readable.from(buffer);
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "proposal-forge/logos", resource_type: "image" },
        (err: Error | undefined, res: { secure_url?: string } | undefined) => {
          if (err) reject(err);
          else if (res?.secure_url) resolve({ secure_url: res.secure_url });
          else reject(new Error("No URL returned"));
        }
      );
      stream.pipe(uploadStream);
    });

    return res.json({ url: result.secure_url, fileName: name });
  } catch (err) {
    console.error("Upload logo error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
