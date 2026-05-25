import { Router } from "express";
import { randomBytes } from "node:crypto";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

// POST /api/space/create
router.post("/create", requireAuth, async (req, res) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { spaceId: true },
    });

    if (existing?.spaceId) {
      res.status(400).json({ error: "Already in a space. Leave current space first." });
      return;
    }

    const inviteCode = generateInviteCode();

    const space = await prisma.space.create({
      data: { inviteCode },
    });

    await prisma.user.update({
      where: { id: req.userId },
      data: { spaceId: space.id },
    });

    // Update request context so subsequent middleware sees the new spaceId
    req.userSpaceId = space.id;

    res.status(201).json({ spaceId: space.id, inviteCode });
  } catch (err) {
    console.error("space create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/space/join
router.post("/join", requireAuth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      res.status(400).json({ error: "Invite code required" });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { spaceId: true },
    });

    if (existing?.spaceId) {
      res.status(400).json({ error: "Already in a space" });
      return;
    }

    const space = await prisma.space.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { users: { select: { id: true, name: true, email: true } } },
    });

    if (!space) {
      res.status(404).json({ error: "Invalid invite code" });
      return;
    }

    if (space.users.length >= 2) {
      res.status(400).json({ error: "Space is full (2 users max)" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { spaceId: space.id },
    });

    req.userSpaceId = space.id;

    const partner = space.users[0];
    res.json({ spaceId: space.id, partner: partner || null });
  } catch (err) {
    console.error("space join error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/space/info
router.get("/info", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { spaceId: true },
    });

    if (!user?.spaceId) {
      res.json(null);
      return;
    }

    const space = await prisma.space.findUnique({
      where: { id: user.spaceId },
      include: {
        users: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    if (!space) {
      res.json(null);
      return;
    }

    const partner = space.users.find((u) => u.id !== req.userId);

    res.json({
      spaceId: space.id,
      inviteCode: space.inviteCode,
      relationshipStartDate: space.relationshipStartDate?.toISOString().slice(0, 10) ?? null,
      myName: space.myName,
      partnerName: space.partnerName,
      partner: partner
        ? {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            avatar: partner.avatar,
          }
        : null,
    });
  } catch (err) {
    console.error("space info error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/space/leave
router.post("/leave", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { spaceId: true },
    });

    if (!user?.spaceId) {
      res.status(400).json({ error: "Not in a space" });
      return;
    }

    const spaceId = user.spaceId;

    await prisma.user.update({
      where: { id: req.userId },
      data: { spaceId: null },
    });

    req.userSpaceId = null;

    // Delete space if empty
    const remaining = await prisma.user.count({ where: { spaceId } });
    if (remaining === 0) {
      await prisma.space.delete({ where: { id: spaceId } });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("space leave error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
