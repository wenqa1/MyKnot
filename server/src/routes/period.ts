import { Router } from "express";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getSharedUserIds } from "../middleware/space.js";

const router = Router();

// ---- Period prediction helpers ----

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Phase = "menstrual" | "follicular" | "ovulation" | "luteal" | null;

function getCyclePhase(
  today: Date,
  cycleStart: Date,
  cycleDays: number,
  periodDays: number
): { phase: Phase; dayInCycle: number } {
  const diff = daysBetween(cycleStart, today);
  const dayInCycle = ((diff % cycleDays) + cycleDays) % cycleDays + 1;
  const ovulationDay = cycleDays - 13;
  const windowStart = Math.max(periodDays + 1, ovulationDay - 5);
  const windowEnd = Math.min(cycleDays, ovulationDay + 1);

  if (dayInCycle <= periodDays) return { phase: "menstrual", dayInCycle };
  if (dayInCycle >= windowStart && dayInCycle <= windowEnd)
    return { phase: "ovulation", dayInCycle };
  if (dayInCycle < windowStart) return { phase: "follicular", dayInCycle };
  return { phase: "luteal", dayInCycle };
}

const PHASE_LABELS: Record<string, string> = {
  menstrual: "经期",
  follicular: "卵泡期",
  ovulation: "排卵期",
  luteal: "黄体期",
};

const PHASE_TIPS: Record<string, string> = {
  menstrual: "注意保暖，避免生冷食物，适当休息",
  follicular: "精力充沛，适合运动和尝试新事物",
  ovulation: "受孕几率最高，注意保持良好的心情",
  luteal: "可能会出现情绪波动，适当补充营养",
};

// ---- Routes ----

// GET /period
router.get("/", requireAuth, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req);

    const config = await prisma.periodConfig.findFirst({
      where: { userId: { in: userIds } },
    });

    const records = await prisma.periodRecord.findMany({
      where: { userId: { in: userIds } },
      orderBy: { startDate: "desc" },
    });

    let prediction = null;
    if (config && records.length > 0) {
      const latestRecord = records[0];
      const today = new Date();
      const nextStartDate = addDays(latestRecord.startDate, config.cycleDays);
      const daysUntilNext = daysBetween(today, nextStartDate);
      const ovulationDate = addDays(nextStartDate, -14);
      const ovulationWindowStart = addDays(ovulationDate, -5);
      const ovulationWindowEnd = addDays(ovulationDate, 1);
      const { phase, dayInCycle } = getCyclePhase(
        today,
        latestRecord.startDate,
        config.cycleDays,
        config.periodDays
      );

      // Find next period after the currently predicted one
      const prevPeriodStart = latestRecord.startDate;
      const currentPeriodStart =
        daysBetween(today, nextStartDate) < -config.periodDays
          ? addDays(nextStartDate, config.cycleDays)
          : nextStartDate;

      prediction = {
        nextStartDate: toISODate(currentPeriodStart),
        daysUntilNext:
          daysUntilNext < 0
            ? daysBetween(today, currentPeriodStart)
            : daysUntilNext,
        ovulationDate: ovulationDate ? toISODate(ovulationDate) : null,
        ovulationWindowStart: ovulationWindowStart
          ? toISODate(ovulationWindowStart)
          : null,
        ovulationWindowEnd: ovulationWindowEnd
          ? toISODate(ovulationWindowEnd)
          : null,
        currentPhase: phase,
        currentPhaseLabel: phase ? PHASE_LABELS[phase] : null,
        currentPhaseTip: phase ? PHASE_TIPS[phase] : null,
        dayInCycle,
      };
    }

    res.json({
      config: config || { cycleDays: 28, periodDays: 5 },
      records,
      prediction,
    });
  } catch (err) {
    console.error("get period error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /period/config
router.put("/config", requireAuth, async (req, res) => {
  try {
    const { cycleDays, periodDays } = req.body;

    const config = await prisma.periodConfig.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId!,
        cycleDays: cycleDays || 28,
        periodDays: periodDays || 5,
      },
      update: {
        cycleDays: cycleDays ?? undefined,
        periodDays: periodDays ?? undefined,
      },
    });

    res.json(config);
  } catch (err) {
    console.error("put period config error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /period/records
router.get("/records", requireAuth, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req);
    const records = await prisma.periodRecord.findMany({
      where: { userId: { in: userIds } },
      orderBy: { startDate: "desc" },
    });
    res.json(records);
  } catch (err) {
    console.error("get period records error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /period/records
router.post("/records", requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, note, symptoms } = req.body;

    if (!startDate) {
      res.status(400).json({ error: "startDate is required" });
      return;
    }

    const record = await prisma.periodRecord.create({
      data: {
        userId: req.userId!,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        note: note || null,
        symptoms: symptoms ? JSON.stringify(symptoms) : "[]",
      },
    });

    res.status(201).json(record);
  } catch (err) {
    console.error("create period record error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /period/records/:id
router.put("/records/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);
    const existing = await prisma.periodRecord.findFirst({
      where: { id, userId: { in: userIds } },
    });

    if (!existing) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    const { startDate, endDate, note, symptoms } = req.body;

    const record = await prisma.periodRecord.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existing.endDate,
        note: note !== undefined ? note : existing.note,
        symptoms: symptoms !== undefined ? JSON.stringify(symptoms) : existing.symptoms,
      },
    });

    res.json(record);
  } catch (err) {
    console.error("update period record error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /period/records/:id
router.delete("/records/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userIds = await getSharedUserIds(req);
    const existing = await prisma.periodRecord.findFirst({
      where: { id, userId: { in: userIds } },
    });

    if (!existing) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    await prisma.periodRecord.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("delete period record error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
