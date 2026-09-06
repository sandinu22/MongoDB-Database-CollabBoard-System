import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import taskRoutes, { getColumns } from "./routes/tasks.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "CollabBoard API is running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/boards", requireAuth, boardRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.get("/api/columns", requireAuth, getColumns);

app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.code === 11000) return res.status(409).json({ success: false, message: "A unique value is already in use" });
  if (error?.name === "ValidationError" || error?.name === "CastError" || error instanceof SyntaxError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  res.status(500).json({ success: false, message: "Internal server error" });
});

if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => app.listen(port, () => console.log(`CollabBoard API running at http://localhost:${port}`)))
    .catch((error) => {
      console.error(`MongoDB startup failed: ${error.message}`);
      process.exitCode = 1;
    });
}

export default app;
