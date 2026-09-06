import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return res.status(401).json({ success: false, message: "Authentication required" });
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ success: false, message: "User account not found" });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
    next(error);
  }
}
