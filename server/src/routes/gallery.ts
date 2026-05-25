import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { imageSize as sizeOf } from "image-size";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getSharedUserIds } from "../middleware/space.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "gallery");

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

// ── Image routes ──

// GET /gallery — list images, optional ?albumId=
router.get("/", requireAuth, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req);
    const albumId = req.query.albumId ? parseInt(req.query.albumId as string) : undefined;

    const where: Record<string, unknown> = { userId: { in: userIds } };
    if (albumId !== undefined && !isNaN(albumId)) {
      where.albumId = albumId;
    }

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(images);
  } catch (err) {
    console.error("get gallery error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /gallery — upload image, optional albumId in form
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
      // leave as 0
    }

    const albumIdRaw = req.body.albumId ? parseInt(req.body.albumId as string) : null;
    const albumId = albumIdRaw && !isNaN(albumIdRaw) ? albumIdRaw : null;

    const caption = (req.body.caption as string)?.trim() || "";

    const image = await prisma.galleryImage.create({
      data: {
        userId: req.userId!,
        filename: req.file.filename,
        originalName: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        mimeType: req.file.mimetype,
        width,
        height,
        size: req.file.size,
        albumId,
        caption,
      },
    });

    res.status(201).json(image);
  } catch (err) {
    console.error("upload gallery error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /gallery/:id/caption — update image caption
router.patch("/:id/caption", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);

    const image = await prisma.galleryImage.findFirst({
      where: { id, userId: { in: userIds } },
    });
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const { caption } = req.body as { caption: string };
    const updated = await prisma.galleryImage.update({
      where: { id },
      data: { caption: (caption || "").trim() },
    });
    res.json(updated);
  } catch (err) {
    console.error("update caption error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Album routes (must come before /:id routes) ──

// GET /gallery/albums
router.get("/albums", requireAuth, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req);
    const albums = await prisma.galleryAlbum.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { images: true } } },
    });
    res.json(albums);
  } catch (err) {
    console.error("get albums error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /gallery/albums
router.post("/albums", requireAuth, async (req, res) => {
  try {
    const { name } = req.body as { name: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "Album name is required" });
      return;
    }
    const album = await prisma.galleryAlbum.create({
      data: { name: name.trim(), userId: req.userId! },
    });
    res.status(201).json(album);
  } catch (err) {
    console.error("create album error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /gallery/albums/:id
router.put("/albums/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);
    const album = await prisma.galleryAlbum.findFirst({
      where: { id, userId: { in: userIds } },
    });
    if (!album) {
      res.status(404).json({ error: "Album not found" });
      return;
    }

    const { name } = req.body as { name: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "Album name is required" });
      return;
    }
    const updated = await prisma.galleryAlbum.update({
      where: { id },
      data: { name: name.trim() },
    });
    res.json(updated);
  } catch (err) {
    console.error("update album error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /gallery/albums/:id
router.delete("/albums/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);
    const album = await prisma.galleryAlbum.findFirst({
      where: { id, userId: { in: userIds } },
    });
    if (!album) {
      res.status(404).json({ error: "Album not found" });
      return;
    }
    await prisma.galleryAlbum.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("delete album error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Image-specific routes (params: :id) ──

// PUT /gallery/:id/album — move image to an album
router.put("/:id/album", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);

    const image = await prisma.galleryImage.findFirst({
      where: { id, userId: { in: userIds } },
    });
    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const { albumId } = req.body as { albumId: number | null };
    const updated = await prisma.galleryImage.update({
      where: { id },
      data: { albumId },
    });
    res.json(updated);
  } catch (err) {
    console.error("move image error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /gallery/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);
    const image = await prisma.galleryImage.findFirst({
      where: { id, userId: { in: userIds } },
    });

    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

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
