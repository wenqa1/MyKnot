import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import eventsRoutes from "./routes/events.js";
import scheduleRoutes from "./routes/schedule.js";
import periodRoutes from "./routes/period.js";
import galleryRoutes from "./routes/gallery.js";
import adminRoutes from "./routes/admin.js";
import spaceRoutes from "./routes/space.js";
import uploadRoutes from "./routes/upload.js";
import notificationRoutes from "./routes/notifications.js";
import { checkAllUsersScheduled } from "./utils/notification-check.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || "3001");
const HOST = process.env.HOST || "0.0.0.0";

// Middleware
app.use(cors());
app.use(express.json());

// Static files for uploaded images
app.use(
  "/gallery/files",
  express.static(path.join(__dirname, "..", "uploads", "gallery"), {
    maxAge: "30d",
    immutable: true,
  })
);

// Static files for avatars
app.use(
  "/uploads/avatars",
  express.static(path.join(__dirname, "..", "uploads", "avatars"), {
    maxAge: "7d",
  })
);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/period", periodRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/space", spaceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notification", notificationRoutes);

// Scheduled notification check — runs every minute
setInterval(async () => {
  try {
    const sent = await checkAllUsersScheduled();
    if (sent > 0) {
      console.log(`[Notify] Scheduled check sent ${sent} notifications`);
    }
  } catch (err) {
    console.error("[Notify] Scheduled check error:", err);
  }
}, 60000);

// Error handler for multer file size limit
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err.message === "File too large" || err.message.includes("Unsupported")) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, HOST, () => {
  console.log(`[Knot] Server running at http://${HOST}:${PORT}`);
  console.log(`[Knot] Environment: ${process.env.NODE_ENV || "development"}`);
});
