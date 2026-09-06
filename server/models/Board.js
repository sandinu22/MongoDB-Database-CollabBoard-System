import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 800 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

boardSchema.index({ owner: 1, updatedAt: -1 });
boardSchema.index({ members: 1, updatedAt: -1 });

export default mongoose.model("Board", boardSchema);
