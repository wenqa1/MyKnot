import { Router } from "express";
import prisma from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { checkAndNotifyForUser } from "../utils/notification-check.js";

const router = Router();

// GET /api/notification/config
router.get("/config", requireAuth, async (req, res) => {
  try {
    let config = await prisma.notificationConfig.findUnique({
      where: { userId: req.userId! },
    });
    if (!config) {
      config = await prisma.notificationConfig.create({
        data: { userId: req.userId! },
      });
    }
    res.json(config);
  } catch (err) {
    console.error("notification config get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/notification/config
router.put("/config", requireAuth, async (req, res) => {
  try {
    const {
      emailEnabled, barkToken, barkEnabled,
      serverChanKey, serverChanEnabled,
      webhookUrl, webhookEnabled,
      dingTalkUrl, dingTalkEnabled,
      weComUrl, weComEnabled,
      notifyOnEvent, notifyOnPeriod, notifyOnAnniversary,
      advanceDays, notifyTime,
    } = req.body;

    const config = await prisma.notificationConfig.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        ...(emailEnabled !== undefined ? { emailEnabled } : {}),
        ...(barkToken !== undefined ? { barkToken } : {}),
        ...(barkEnabled !== undefined ? { barkEnabled } : {}),
        ...(serverChanKey !== undefined ? { serverChanKey } : {}),
        ...(serverChanEnabled !== undefined ? { serverChanEnabled } : {}),
        ...(webhookUrl !== undefined ? { webhookUrl } : {}),
        ...(webhookEnabled !== undefined ? { webhookEnabled } : {}),
        ...(dingTalkUrl !== undefined ? { dingTalkUrl } : {}),
        ...(dingTalkEnabled !== undefined ? { dingTalkEnabled } : {}),
        ...(weComUrl !== undefined ? { weComUrl } : {}),
        ...(weComEnabled !== undefined ? { weComEnabled } : {}),
        ...(notifyOnEvent !== undefined ? { notifyOnEvent } : {}),
        ...(notifyOnPeriod !== undefined ? { notifyOnPeriod } : {}),
        ...(notifyOnAnniversary !== undefined ? { notifyOnAnniversary } : {}),
        ...(advanceDays !== undefined ? { advanceDays } : {}),
        ...(notifyTime !== undefined ? { notifyTime } : {}),
      },
      update: {
        ...(emailEnabled !== undefined ? { emailEnabled } : {}),
        ...(barkToken !== undefined ? { barkToken } : {}),
        ...(barkEnabled !== undefined ? { barkEnabled } : {}),
        ...(serverChanKey !== undefined ? { serverChanKey } : {}),
        ...(serverChanEnabled !== undefined ? { serverChanEnabled } : {}),
        ...(webhookUrl !== undefined ? { webhookUrl } : {}),
        ...(webhookEnabled !== undefined ? { webhookEnabled } : {}),
        ...(dingTalkUrl !== undefined ? { dingTalkUrl } : {}),
        ...(dingTalkEnabled !== undefined ? { dingTalkEnabled } : {}),
        ...(weComUrl !== undefined ? { weComUrl } : {}),
        ...(weComEnabled !== undefined ? { weComEnabled } : {}),
        ...(notifyOnEvent !== undefined ? { notifyOnEvent } : {}),
        ...(notifyOnPeriod !== undefined ? { notifyOnPeriod } : {}),
        ...(notifyOnAnniversary !== undefined ? { notifyOnAnniversary } : {}),
        ...(advanceDays !== undefined ? { advanceDays } : {}),
        ...(notifyTime !== undefined ? { notifyTime } : {}),
      },
    });

    res.json(config);
  } catch (err) {
    console.error("notification config put error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notification/check — manually trigger check
router.post("/check", requireAuth, async (req, res) => {
  try {
    const sent = await checkAndNotifyForUser(req.userId!);
    res.json({ sent });
  } catch (err) {
    console.error("notification check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/notification/logs — recent notification logs
router.get("/logs", requireAuth, async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(logs);
  } catch (err) {
    console.error("notification logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notification/test — send a test notification via Bark
router.post("/test", requireAuth, async (req, res) => {
  try {
    const { channel } = req.body;
    const config = await prisma.notificationConfig.findUnique({
      where: { userId: req.userId! },
    });
    if (!config) {
      res.status(400).json({ error: "No notification config found" });
      return;
    }

    const title = "MyKnot 测试通知";
    const body = "这是一条测试消息，通知配置正常！";

    if (channel === "bark") {
      if (!config.barkToken) {
        res.status(400).json({ error: "Bark 未配置" });
        return;
      }
      const { sendBarkNotification } = await import("../utils/notifications.js");
      await sendBarkNotification(config.barkToken, title, body);
      res.json({ ok: true, message: "Bark 测试通知已发送" });
      return;
    }

    // Default: test all enabled channels
    const { sendToAllChannels } = await import("../utils/notifications.js");
    const refId = `test-${Date.now()}`;
    const sent = await sendToAllChannels(req.userId!, "event", refId, title, body);
    res.json({ sent, message: `已发送 ${sent} 条测试通知` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "发送失败";
    console.error("notification test error:", err);
    res.status(500).json({ error: msg });
  }
});

export default router;
