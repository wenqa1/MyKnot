import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { imageSize as sizeOf } from "image-size";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "gallery");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported image format"));
    }
  },
});

const router = Router();

// GET /gallery
router.get("/", requireAuth, async (req, res) => {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(images);
  } catch (err) {
    console.error("get gallery error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /gallery
router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const filePath = req.file.path;
    let width = 0;
    let height = 0;

    try {
      const buf = fs.readFileSync(filePath);
      const dimensions = sizeOf(buf);
      width = dimensions.width || 0;
      height = dimensions.height || 0;
    } catch {
      // If can't read dimensions, leave as 0
    }

    const image = await prisma.galleryImage.create({
      data: {
        userId: req.userId!,
        filename: req.file.filename,
        originalName: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        mimeType: req.file.mimetype,
        width,
        height,
        size: req.file.size,
      },
    });

    res.status(201).json(image);
  } catch (err) {
    console.error("upload gallery error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /gallery/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const image = await prisma.galleryImage.findFirst({
      where: { id, userId: req.userId },
    });

    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.galleryImage.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    console.error("delete gallery error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
