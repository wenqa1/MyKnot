import { Router } from "express";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { sendTestEmail } from "../utils/email.js";

const router = Router();

// GET /api/admin/users
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        spaceId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error("admin users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { role, disabled } = req.body;

    if (role && !["user", "admin"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) data.role = role;
    if (disabled !== undefined) data.disabled = disabled;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        spaceId: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (err) {
    console.error("admin update user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/stats
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, usersWithPassword, usersWithSpace, totalEvents, totalImages] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { password: { not: null } } }),
        prisma.user.count({ where: { spaceId: { not: null } } }),
        prisma.event.count(),
        prisma.galleryImage.count(),
      ]);
    res.json({
      totalUsers,
      usersWithPassword,
      usersWithSpace,
      totalEvents,
      totalImages,
    });
  } catch (err) {
    console.error("admin stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/smtp
router.get("/smtp", requireAuth, requireAdmin, async (_req, res) => {
  try {
    let config = await prisma.smtpConfig.findFirst();
    if (!config) {
      config = await prisma.smtpConfig.create({ data: {} });
    }
    res.json(config);
  } catch (err) {
    console.error("admin smtp get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/smtp
router.put("/smtp", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { host, port, user, pass, fromEmail, fromName, secure } = req.body;

    let config = await prisma.smtpConfig.findFirst();
    if (!config) {
      config = await prisma.smtpConfig.create({
        data: {
          host: host || "",
          port: port || 587,
          user: user || "",
          pass: pass || "",
          fromEmail: fromEmail || "",
          fromName: fromName || "MyKnot",
          secure: secure || false,
        },
      });
    } else {
      config = await prisma.smtpConfig.update({
        where: { id: config.id },
        data: {
          ...(host !== undefined ? { host } : {}),
          ...(port !== undefined ? { port } : {}),
          ...(user !== undefined ? { user } : {}),
          ...(pass !== undefined ? { pass } : {}),
          ...(fromEmail !== undefined ? { fromEmail } : {}),
          ...(fromName !== undefined ? { fromName } : {}),
          ...(secure !== undefined ? { secure } : {}),
        },
      });
    }

    res.json(config);
  } catch (err) {
    console.error("admin smtp put error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/smtp/test
router.post("/smtp/test", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Test email address required" });
      return;
    }

    await sendTestEmail(email);
    res.json({ ok: true });
  } catch (err) {
    console.error("admin smtp test error:", err);
    res.status(500).json({ error: "Failed to send test email. Check SMTP settings." });
  }
});

export default router;
