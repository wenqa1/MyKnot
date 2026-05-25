import { Router } from "express";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getSharedUserIds } from "../middleware/space.js";

const router = Router();

const DEFAULT_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const DEFAULT_TIMES = ["08:00", "10:10", "14:00", "16:10", "19:00"];

// GET /schedule
router.get("/", requireAuth, async (req, res) => {
  try {
    let config = await prisma.scheduleConfig.findUnique({
      where: { userId: req.userId },
    });

    if (!config) {
      config = await prisma.scheduleConfig.create({
        data: {
          userId: req.userId!,
          daysJson: JSON.stringify(DEFAULT_DAYS),
          timesJson: JSON.stringify(DEFAULT_TIMES),
        },
      });
    }

    const userIds = await getSharedUserIds(req);
    const items = await prisma.scheduleItem.findMany({
      where: { userId: { in: userIds } },
    });

    res.json({
      days: JSON.parse(config.daysJson),
      times: JSON.parse(config.timesJson),
      items,
    });
  } catch (err) {
    console.error("get schedule error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /schedule
router.put("/", requireAuth, async (req, res) => {
  try {
    const { days, times, items } = req.body;

    const config = await prisma.scheduleConfig.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId!,
        daysJson: JSON.stringify(days || DEFAULT_DAYS),
        timesJson: JSON.stringify(times || DEFAULT_TIMES),
      },
      update: {
        daysJson: days ? JSON.stringify(days) : undefined,
        timesJson: times ? JSON.stringify(times) : undefined,
      },
    });

    // Replace only this user's items
    if (items) {
      await prisma.scheduleItem.deleteMany({ where: { userId: req.userId } });

      if (items.length > 0) {
        await prisma.scheduleItem.createMany({
          data: items.map((item: { dayIndex: number; timeIndex: number; subject: string; person: string; duration: number }) => ({
            userId: req.userId!,
            dayIndex: item.dayIndex,
            timeIndex: item.timeIndex,
            subject: item.subject,
            person: item.person,
            duration: item.duration || 2,
          })),
        });
      }
    }

    const userIds = await getSharedUserIds(req);
    const updatedItems = await prisma.scheduleItem.findMany({
      where: { userId: { in: userIds } },
    });

    res.json({
      days: JSON.parse(config.daysJson),
      times: JSON.parse(config.timesJson),
      items: updatedItems,
    });
  } catch (err) {
    console.error("put schedule error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
