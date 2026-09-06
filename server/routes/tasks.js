import express from "express";
import mongoose from "mongoose";
import Board from "../models/Board.js";
import Task from "../models/Task.js";

const router = express.Router();
const columns = [
  { id: "todo", title: "To Do", status: "To Do", tone: "todo" },
  { id: "doing", title: "Doing", status: "Doing", tone: "doing" },
  { id: "done", title: "Done", status: "Done", tone: "done" },
];
const priorities = ["Low", "Medium", "High"];
const editableFields = ["title", "description", "priority", "assignee", "due", "comments", "progress", "columnId", "status", "assignedTo"];

function serializeTask(task) {
  const value = task.toObject ? task.toObject() : task;
  return { ...value, id: String(value._id) };
}

async function canAccessBoard(boardId, userId) {
  if (!mongoose.isValidObjectId(boardId)) return null;
  return Board.findOne({ _id: boardId, $or: [{ owner: userId }, { members: userId }] }).select("_id").lean();
}

function validateTask(body, partial = false) {
  const errors = [];
  if ((!partial || body.title !== undefined) && (typeof body.title !== "string" || !body.title.trim())) errors.push("title is required");
  if (body.columnId !== undefined && !columns.some((column) => column.id === body.columnId)) errors.push("columnId must be todo, doing, or done");
  if (body.status !== undefined && !columns.some((column) => column.status === body.status)) errors.push("status must be To Do, Doing, or Done");
  if (body.priority !== undefined && !priorities.includes(body.priority)) errors.push("priority must be Low, Medium, or High");
  if (body.progress !== undefined && (!Number.isFinite(Number(body.progress)) || Number(body.progress) < 0 || Number(body.progress) > 100)) errors.push("progress must be between 0 and 100");
  if (body.comments !== undefined && (!Number.isInteger(Number(body.comments)) || Number(body.comments) < 0)) errors.push("comments must be zero or a positive integer");
  return errors;
}

function normalizeTaskBody(body, fields = editableFields) {
  const result = {};
  for (const key of fields) {
    if (body[key] !== undefined) result[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
  }
  if (result.progress !== undefined) result.progress = Number(result.progress);
  if (result.comments !== undefined) result.comments = Number(result.comments);
  if (result.assignedTo === "") result.assignedTo = null;
  if (result.columnId && !result.status) result.status = columns.find((column) => column.id === result.columnId).status;
  if (result.status && !result.columnId) result.columnId = columns.find((column) => column.status === result.status).id;
  if (result.columnId === "done" && result.progress === undefined) result.progress = 100;
  return result;
}

async function getAccessibleTask(taskId, userId) {
  if (!mongoose.isValidObjectId(taskId)) return null;
  const task = await Task.findById(taskId);
  if (!task) return null;
  return (await canAccessBoard(task.boardId, userId)) ? task : "forbidden";
}

export async function getColumns(req, res, next) {
  try {
    const boardId = req.query.boardId;
    if (!boardId) return res.status(400).json({ success: false, message: "boardId is required" });
    if (!(await canAccessBoard(boardId, req.user._id))) return res.status(403).json({ success: false, message: "Board access denied" });
    const tasks = (await Task.find({ boardId }).sort({ createdAt: 1 })).map(serializeTask);
    res.json({ success: true, data: columns.map((column) => ({ ...column, tasks: tasks.filter((task) => task.columnId === column.id) })) });
  } catch (error) { next(error); }
}

router.get("/columns", getColumns);

router.get("/", async (req, res, next) => {
  try {
    const boardId = req.query.boardId;
    if (!boardId) return res.status(400).json({ success: false, message: "boardId is required" });
    if (!(await canAccessBoard(boardId, req.user._id))) return res.status(403).json({ success: false, message: "Board access denied" });
    const filter = { boardId };
    if (req.query.columnId) filter.columnId = req.query.columnId;
    if (req.query.priority) filter.priority = new RegExp(`^${String(req.query.priority).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (req.query.assignee) filter.assignee = new RegExp(`^${String(req.query.assignee).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const tasks = (await Task.find(filter).sort({ createdAt: 1 })).map(serializeTask);
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const task = await getAccessibleTask(req.params.id, req.user._id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task === "forbidden") return res.status(403).json({ success: false, message: "Task access denied" });
    res.json({ success: true, data: serializeTask(task) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const boardId = req.body.boardId;
    if (!boardId) return res.status(400).json({ success: false, message: "boardId is required" });
    if (!(await canAccessBoard(boardId, req.user._id))) return res.status(403).json({ success: false, message: "Board access denied" });
    const errors = validateTask(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });
    const input = normalizeTaskBody(req.body);
    const task = await Task.create({
      ...input,
      boardId,
      createdBy: req.user._id,
      description: input.description ?? "",
      priority: input.priority ?? "Medium",
      assignee: input.assignee ?? req.user.name,
      due: input.due ?? "",
      comments: input.comments ?? 0,
      progress: input.progress ?? 0,
    });
    res.status(201).json({ success: true, data: serializeTask(task) });
  } catch (error) { next(error); }
});

async function updateTask(req, res, next) {
  try {
    const task = await getAccessibleTask(req.params.id, req.user._id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task === "forbidden") return res.status(403).json({ success: false, message: "Task access denied" });
    const errors = validateTask(req.body, true);
    if (errors.length) return res.status(400).json({ success: false, errors });
    if (!Number.isInteger(req.body.version)) return res.status(400).json({ success: false, message: "version is required when updating a task" });

    const updated = await Task.findOneAndUpdate(
      { _id: task._id, version: req.body.version },
      { $set: normalizeTaskBody(req.body), $inc: { version: 1 } },
      { new: true, runValidators: true }
    );
    if (updated) return res.json({ success: true, data: serializeTask(updated) });
    const serverTask = await Task.findById(task._id);
    res.status(409).json({ success: false, message: "Task has been modified by another user.", conflict: true, serverTask: serializeTask(serverTask) });
  } catch (error) { next(error); }
}

router.put("/:id", updateTask);
router.patch("/:id", updateTask);

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await getAccessibleTask(req.params.id, req.user._id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task === "forbidden") return res.status(403).json({ success: false, message: "Task access denied" });
    await task.deleteOne();
    res.json({ success: true, data: serializeTask(task) });
  } catch (error) { next(error); }
});

export { columns };
export default router;
