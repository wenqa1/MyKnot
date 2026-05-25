import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getSharedUserIds } from "../middleware/space.js";
import prisma from "../db/prisma.js";

const router = Router();

// GET /api/sync/export — export all user data as JSON
router.get("/export", requireAuth, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req);

    const [
      profile,
      events,
      schedule,
      periodConfig,
      periodRecords,
      galleryImages,
      galleryAlbums,
      notifConfig,
      spaceInfo,
    ] = await Promise.all([
      prisma.profile.findFirst({ where: { userId: { in: userIds } } }),
      prisma.event.findMany({ where: { userId: { in: userIds } } }),
      prisma.scheduleItem.findMany({ where: { userId: { in: userIds } } }),
      prisma.periodConfig.findFirst({ where: { userId: { in: userIds } } }),
      prisma.periodRecord.findMany({ where: { userId: { in: userIds } }, orderBy: { startDate: "desc" } }),
      prisma.galleryImage.findMany({ where: { userId: { in: userIds } } }),
      prisma.galleryAlbum.findMany({ where: { userId: { in: userIds } } }),
      prisma.notificationConfig.findFirst({ where: { userId: { in: userIds } } }),
      prisma.space.findFirst({
        where: { users: { some: { id: { in: userIds } } } },
        include: {
          users: { select: { id: true, name: true, email: true, avatar: true } },
        },
      }),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      version: 1,
      profile,
      events,
      schedule: { items: schedule },
      period: { config: periodConfig, records: periodRecords },
      gallery: { images: galleryImages, albums: galleryAlbums },
      notification: notifConfig,
      space: spaceInfo,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=myknot-backup.json");
    res.json(data);
  } catch (err) {
    console.error("sync export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

// POST /api/sync/import — import data from JSON backup
router.post("/import", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!;
    const data = req.body;
    if (!data || data.version !== 1) {
      res.status(400).json({ error: "Invalid backup format" });
      return;
    }

    let imported = 0;

    // Import events
    if (Array.isArray(data.events)) {
      for (const evt of data.events) {
        const existing = await prisma.event.findFirst({
          where: { userId, name: evt.name, date: new Date(evt.date) },
        });
        if (!existing) {
          await prisma.event.create({
            data: {
              userId,
              name: evt.name,
              date: new Date(evt.date),
              calendarType: evt.calendarType || "solar",
              lunarMonth: evt.lunarMonth,
              lunarDay: evt.lunarDay,
              lunarIsLeapMonth: evt.lunarIsLeapMonth || false,
              time: evt.time,
              startTime: evt.startTime,
              endTime: evt.endTime,
              recurrence: evt.recurrence || "none",
              icon: evt.icon || "Heart",
              description: evt.description || "",
              color: evt.color || "bg-pink-100 text-pink-600",
              tag: evt.tag || "MEMORY",
              sortOrder: evt.sortOrder || 0,
            },
          });
          imported++;
        }
      }
    }

    // Import schedule — replace all
    if (data.schedule?.items && Array.isArray(data.schedule.items)) {
      await prisma.scheduleItem.deleteMany({ where: { userId } });
      for (const item of data.schedule.items) {
        await prisma.scheduleItem.create({
          data: {
            userId,
            dayIndex: item.dayIndex ?? 0,
            timeIndex: item.timeIndex ?? 0,
            subject: item.subject || "",
            person: item.person || "both",
            duration: item.duration || 1,
          },
        });
        imported++;
      }
    }

    // Import period config
    if (data.period?.config) {
      await prisma.periodConfig.upsert({
        where: { userId },
        create: {
          userId,
          cycleDays: data.period.config.cycleDays || 28,
          periodDays: data.period.config.periodDays || 5,
        },
        update: {
          cycleDays: data.period.config.cycleDays || 28,
          periodDays: data.period.config.periodDays || 5,
        },
      });
    }

    // Import period records
    if (data.period?.records && Array.isArray(data.period.records)) {
      for (const rec of data.period.records) {
        const exists = await prisma.periodRecord.findFirst({
          where: { userId, startDate: rec.startDate },
        });
        if (!exists) {
          await prisma.periodRecord.create({
            data: {
              userId,
              startDate: rec.startDate,
              endDate: rec.endDate,
              note: rec.note,
              symptoms: rec.symptoms || "[]",
            },
          });
          imported++;
        }
      }
    }

    // Import gallery albums
    if (data.gallery?.albums && Array.isArray(data.gallery.albums)) {
      for (const album of data.gallery.albums) {
        const existing = await prisma.galleryAlbum.findFirst({
          where: { userId, name: album.name },
        });
        if (!existing) {
          await prisma.galleryAlbum.create({
            data: { userId, name: album.name },
          });
        }
      }
    }

    // Import profile
    if (data.profile) {
      await prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          relationshipStartDate: data.profile.relationshipStartDate,
          myName: data.profile.myName,
          partnerName: data.profile.partnerName,
        },
        update: {
          relationshipStartDate: data.profile.relationshipStartDate,
          myName: data.profile.myName,
          partnerName: data.profile.partnerName,
        },
      });
    }

    // Import notification config
    if (data.notification) {
      const nc = data.notification;
      await prisma.notificationConfig.upsert({
        where: { userId },
        create: {
          userId,
          emailEnabled: nc.emailEnabled ?? false,
          barkToken: nc.barkToken ?? "",
          barkEnabled: nc.barkEnabled ?? false,
          serverChanKey: nc.serverChanKey ?? "",
          serverChanEnabled: nc.serverChanEnabled ?? false,
          webhookUrl: nc.webhookUrl ?? "",
          webhookEnabled: nc.webhookEnabled ?? false,
          dingTalkUrl: nc.dingTalkUrl ?? "",
          dingTalkEnabled: nc.dingTalkEnabled ?? false,
          weComUrl: nc.weComUrl ?? "",
          weComEnabled: nc.weComEnabled ?? false,
          notifyOnEvent: nc.notifyOnEvent ?? true,
          notifyOnPeriod: nc.notifyOnPeriod ?? true,
          notifyOnAnniversary: nc.notifyOnAnniversary ?? true,
          advanceDays: nc.advanceDays ?? 1,
          notifyTime: nc.notifyTime ?? "08:00",
        },
        update: {
          emailEnabled: nc.emailEnabled ?? false,
          barkToken: nc.barkToken ?? "",
          barkEnabled: nc.barkEnabled ?? false,
          serverChanKey: nc.serverChanKey ?? "",
          serverChanEnabled: nc.serverChanEnabled ?? false,
          webhookUrl: nc.webhookUrl ?? "",
          webhookEnabled: nc.webhookEnabled ?? false,
          dingTalkUrl: nc.dingTalkUrl ?? "",
          dingTalkEnabled: nc.dingTalkEnabled ?? false,
          weComUrl: nc.weComUrl ?? "",
          weComEnabled: nc.weComEnabled ?? false,
          notifyOnEvent: nc.notifyOnEvent ?? true,
          notifyOnPeriod: nc.notifyOnPeriod ?? true,
          notifyOnAnniversary: nc.notifyOnAnniversary ?? true,
          advanceDays: nc.advanceDays ?? 1,
          notifyTime: nc.notifyTime ?? "08:00",
        },
      });
    }

    res.json({ ok: true, imported });
  } catch (err) {
    console.error("sync import error:", err);
    res.status(500).json({ error: "Import failed" });
  }
});

export default router;
