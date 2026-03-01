import mongoose from "mongoose";

const templateSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    sampleText: { type: String, default: "Heading Text" },
    cssClass: { type: String, default: "" },
    styleOverrides: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    tag: { type: String, default: "" },
  },
  { timestamps: true }
);

templateSchema.index({ id: 1 });

export const Template = mongoose.model("Template", templateSchema);

export type TemplateDoc = {
  _id: string;
  id: string;
  name: string;
  sampleText?: string;
  cssClass?: string;
  styleOverrides?: Record<string, unknown>;
  tag?: string;
};
