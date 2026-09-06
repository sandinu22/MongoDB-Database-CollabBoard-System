import express from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { signToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt };
}

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const errors = [];
    if (name.length < 2) errors.push("name must contain at least 2 characters");
    if (!emailPattern.test(email)) errors.push("a valid email is required");
    if (password.length < 8) errors.push("password must contain at least 8 characters");
    if (errors.length) return res.status(400).json({ success: false, errors });
    if (await User.exists({ email })) return res.status(409).json({ success: false, message: "An account with this email already exists" });
    const user = await User.create({ name, email, password: await hashPassword(password) });
    res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await verifyPassword(password, user.password))) return res.status(401).json({ success: false, message: "Invalid email or password" });
    res.json({ success: true, token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, async (req, res) => res.json({ success: true, user: publicUser(req.user) }));

export default router;
