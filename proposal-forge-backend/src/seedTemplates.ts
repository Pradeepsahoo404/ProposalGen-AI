import { Template } from "./models/Template";

const DEFAULT_TEMPLATES = [
  { id: "modern-blue", name: "Modern Blue", tag: "Popular", sampleText: "Heading Text", cssClass: "template-modern-blue", styleOverrides: { primaryColor: "#3b82f6", fontFamily: "sans-serif" } },
  { id: "corporate-minimal", name: "Corporate Minimal", tag: "Corporate", sampleText: "Heading Text", cssClass: "template-corporate-minimal", styleOverrides: { primaryColor: "#475569", fontFamily: "serif" } },
  { id: "bold-tech", name: "Bold Tech", tag: "Best for Tech", sampleText: "Heading Text", cssClass: "template-bold-tech", styleOverrides: { primaryColor: "#34d399", fontFamily: "monospace", darkBg: true } },
  { id: "elegant-serif", name: "Elegant Serif", tag: "Creative", sampleText: "Heading Text", cssClass: "template-elegant-serif", styleOverrides: { primaryColor: "#b45309", fontFamily: "serif" } },
  { id: "warm-professional", name: "Warm Professional", tag: "Consulting", sampleText: "Heading Text", cssClass: "template-warm-professional", styleOverrides: { primaryColor: "#e11d48", fontFamily: "sans-serif" } },
  { id: "slate-executive", name: "Slate Executive", tag: "Executive", sampleText: "Heading Text", cssClass: "template-slate-executive", styleOverrides: { primaryColor: "#0f172a", fontFamily: "sans-serif" } },
];

export async function seedTemplates(): Promise<void> {
  const count = await Template.countDocuments();
  if (count > 0) return;
  await Template.insertMany(DEFAULT_TEMPLATES);
  console.log("Templates seeded:", DEFAULT_TEMPLATES.length);
}
