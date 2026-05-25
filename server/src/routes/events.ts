import { Router } from "express";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /events
router.get("/", requireAuth, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { userId: req.userId },
      orderBy: [{ sortOrder: "asc" }, { date: "asc" }],
    });
    res.json(events);
  } catch (err) {
    console.error("get events error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /events
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, date, calendarType, lunarMonth, lunarDay, lunarIsLeapMonth,
      time, startTime, endTime, recurrence, icon, description, color, tag, sortOrder } = req.body;

    if (!name || !date) {
      res.status(400).json({ error: "name and date are required" });
      return;
    }

    const event = await prisma.event.create({
      data: {
        userId: req.userId!,
        name,
        date: new Date(date),
        calendarType: calendarType || "solar",
        lunarMonth: lunarMonth || null,
        lunarDay: lunarDay || null,
        lunarIsLeapMonth: lunarIsLeapMonth || false,
        time: time || null,
        startTime: startTime || null,
        endTime: endTime || null,
        recurrence: recurrence || "yearly",
        icon: icon || "📅",
        description: description || "",
        color: color || "bg-pink-100 text-pink-600",
        tag: tag || "MEMORY",
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json(event);
  } catch (err) {
    console.error("create event error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /events/:id
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.event.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const { name, date, calendarType, lunarMonth, lunarDay, lunarIsLeapMonth,
      time, startTime, endTime, recurrence, icon, description, color, tag, sortOrder } = req.body;

    const event = await prisma.event.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        date: date ? new Date(date) : existing.date,
        calendarType: calendarType ?? existing.calendarType,
        lunarMonth: lunarMonth !== undefined ? lunarMonth : existing.lunarMonth,
        lunarDay: lunarDay !== undefined ? lunarDay : existing.lunarDay,
        lunarIsLeapMonth: lunarIsLeapMonth !== undefined ? lunarIsLeapMonth : existing.lunarIsLeapMonth,
        time: time !== undefined ? time : existing.time,
        startTime: startTime !== undefined ? startTime : existing.startTime,
        endTime: endTime !== undefined ? endTime : existing.endTime,
        recurrence: recurrence ?? existing.recurrence,
        icon: icon ?? existing.icon,
        description: description ?? existing.description,
        color: color ?? existing.color,
        tag: tag ?? existing.tag,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      },
    });

    res.json(event);
  } catch (err) {
    console.error("update event error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /events/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const existing = await prisma.event.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    await prisma.event.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error("delete event error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
