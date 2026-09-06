import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    status: { type: String, enum: ["To Do", "Doing", "Done"], default: "To Do" },
    columnId: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    assignee: { type: String, default: "Unassigned", trim: true, maxlength: 120 },
    due: { type: String, default: "", trim: true, maxlength: 80 },
    comments: { type: Number, default: 0, min: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

taskSchema.index({ boardId: 1, columnId: 1, createdAt: 1 });

export default mongoose.model("Task", taskSchema);
