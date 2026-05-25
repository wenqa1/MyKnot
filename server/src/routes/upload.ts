import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = path.join(__dirname, "..", "..", "uploads", "avatars");

if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const name = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported image format"));
    }
  },
});

const router = Router();

// POST /api/upload/avatar
router.post("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Delete old avatar if exists
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatar: true },
    });
    if (user?.avatar) {
      const oldPath = path.join(AVATARS_DIR, user.avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: req.file.filename },
    });

    res.json({
      avatar: `/uploads/avatars/${req.file.filename}`,
    });
  } catch (err) {
    console.error("avatar upload error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
