import express from "express";
import Board from "../models/Board.js";
import Task from "../models/Task.js";
import User from "../models/User.js";

const router = express.Router();
const peopleSelect = "name email";

function accessFilter(userId) {
  return { $or: [{ owner: userId }, { members: userId }] };
}

function serializeBoard(board) {
  const value = board.toObject ? board.toObject() : board;
  return { ...value, id: String(value._id) };
}

async function resolveMembers(memberEmails, ownerId) {
  if (!Array.isArray(memberEmails)) return [];
  const emails = [...new Set(memberEmails.map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) return [];
  const users = await User.find({ email: { $in: emails } }).select("_id email").lean();
  return users.filter((user) => String(user._id) !== String(ownerId)).map((user) => user._id);
}

async function populateBoard(query) {
  return query.populate("owner", peopleSelect).populate("members", peopleSelect);
}

router.get("/", async (req, res, next) => {
  try {
    const boards = await populateBoard(Board.find(accessFilter(req.user._id)).sort({ updatedAt: -1 }));
    res.json({ success: true, count: boards.length, data: boards.map(serializeBoard) });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const board = await populateBoard(Board.findOne({ _id: req.params.id, ...accessFilter(req.user._id) }));
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });
    res.json({ success: true, data: serializeBoard(board) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ success: false, message: "Board title is required" });
    const members = await resolveMembers(req.body.memberEmails, req.user._id);
    let board = await Board.create({
      title,
      description: String(req.body.description || "").trim(),
      owner: req.user._id,
      members,
    });
    board = await populateBoard(Board.findById(board._id));
    res.status(201).json({ success: true, data: serializeBoard(board) });
  } catch (error) { next(error); }
});

async function updateBoard(req, res, next) {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });
    if (String(board.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the board owner can edit this board" });
    }
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ success: false, message: "Board title is required" });
      board.title = title;
    }
    if (req.body.description !== undefined) board.description = String(req.body.description || "").trim();
    if (req.body.memberEmails !== undefined) board.members = await resolveMembers(req.body.memberEmails, req.user._id);
    await board.save();
    const populated = await populateBoard(Board.findById(board._id));
    res.json({ success: true, data: serializeBoard(populated) });
  } catch (error) { next(error); }
}

router.put("/:id", updateBoard);
router.patch("/:id", updateBoard);

router.delete("/:id", async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ success: false, message: "Board not found" });
    if (String(board.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the board owner can delete this board" });
    }
    await Task.deleteMany({ boardId: board._id });
    await board.deleteOne();
    res.json({ success: true, data: serializeBoard(board) });
  } catch (error) { next(error); }
});

export default router;
