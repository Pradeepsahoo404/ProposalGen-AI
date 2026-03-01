import mongoose from "mongoose";

const proposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    clientName: { type: String, default: "" },
    clientInput: { type: String, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted"],
      default: "draft",
    },
    content: { type: mongoose.Schema.Types.Mixed },
    shareToken: { type: String, unique: true, sparse: true },
    views: { type: Number, default: 0 },
    sharedAt: { type: Date },
  },
  { timestamps: true }
);

export const Proposal = mongoose.model("Proposal", proposalSchema);
