import { Request, Response } from "express";
import { Template } from "../models/Template";

export async function getTemplates(_req: Request, res: Response) {
  try {
    const docs = await Template.find().sort({ id: 1 }).lean();
    const list = docs.map((d: { _id: unknown; id: string; name: string; sampleText?: string; cssClass?: string; styleOverrides?: Record<string, unknown>; tag?: string }) => ({
      _id: String(d._id),
      id: d.id,
      name: d.name,
      sampleText: d.sampleText ?? "Heading Text",
      cssClass: d.cssClass ?? "",
      styleOverrides: d.styleOverrides ?? {},
      tag: d.tag ?? "",
    }));
    return res.json(list);
  } catch (err) {
    console.error("getTemplates", err);
    return res.status(500).json({ error: "Failed to load templates" });
  }
}
