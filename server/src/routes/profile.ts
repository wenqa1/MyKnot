import { Router } from "express";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.userId },
    });

    if (!profile) {
      res.json({
        relationshipStartDate: null,
        myName: null,
        partnerName: null,
      });
      return;
    }

    res.json({
      relationshipStartDate: profile.relationshipStartDate,
      myName: profile.myName,
      partnerName: profile.partnerName,
    });
  } catch (err) {
    console.error("get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /profile
router.put("/", requireAuth, async (req, res) => {
  try {
    const { relationshipStartDate, myName, partnerName } = req.body;

    if (!relationshipStartDate) {
      res.status(400).json({ error: "relationshipStartDate is required" });
      return;
    }

    const profile = await prisma.profile.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId!,
        relationshipStartDate: new Date(relationshipStartDate),
        myName: myName || null,
        partnerName: partnerName || null,
      },
      update: {
        relationshipStartDate: new Date(relationshipStartDate),
        myName: myName !== undefined ? myName : undefined,
        partnerName: partnerName !== undefined ? partnerName : undefined,
      },
    });

    res.json({
      relationshipStartDate: profile.relationshipStartDate,
      myName: profile.myName,
      partnerName: profile.partnerName,
    });
  } catch (err) {
    console.error("put profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
