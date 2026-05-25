import nodemailer from "nodemailer";
import prisma from "../db/prisma.js";

// ---- Bark (iOS push) ----
// Accepts full URL (https://api.day.app/KEY/) or just the key
function extractBarkKey(input: string): string {
  const urlMatch = input.match(/https?:\/\/[^/]+\/([^/?&\s]+)/);
  if (urlMatch) return urlMatch[1];
  return input.trim().replace(/\/+$/, "");
}

export async function sendBarkNotification(input: string, title: string, body: string) {
  const key = extractBarkKey(input);
  if (!key) throw new Error("Bark key is empty");

  const iconUrl = "https://raw.githubusercontent.com/wenqa1/MyKnot/main/web/public/favicon.png";
  const url = `https://api.day.app/${key}/${encodeURIComponent(title)}/${encodeURIComponent(body)}?icon=${encodeURIComponent(iconUrl)}&group=MyKnot&sound=minuet.caf`;

  console.log(`[Bark] Sending to key: ${key}, title: "${title}"`);
  console.log(`[Bark] URL: ${url}`);

  const res = await fetch(url);
  const data = await res.json();
  console.log(`[Bark] Response:`, JSON.stringify(data));

  if (data.code !== 200) {
    console.error(`[Bark] API error:`, data);
    throw new Error(`Bark send failed: ${data.message || data.code}`);
  }

  console.log(`[Bark] Sent successfully`);
}

// ---- ServerChan (WeChat push) ----
export async function sendServerChanNotification(key: string, title: string, body: string) {
  const res = await fetch(`https://sctapi.ftqq.com/${key}.send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, desp: body }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`ServerChan send failed: ${data.message}`);
}

// ---- DingTalk robot ----
export async function sendDingTalkNotification(webhookUrl: string, body: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "text", text: { content: body } }),
  });
  if (!res.ok) throw new Error(`DingTalk send failed: ${res.status}`);
}

// ---- WeCom (企业微信) robot ----
export async function sendWeComNotification(webhookUrl: string, body: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "text", text: { content: body } }),
  });
  if (!res.ok) throw new Error(`WeCom send failed: ${res.status}`);
}

// ---- Custom Webhook ----
export async function sendWebhookNotification(webhookUrl: string, title: string, body: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, source: "MyKnot" }),
  });
  if (!res.ok) throw new Error(`Webhook send failed: ${res.status}`);
}

// ---- Email notification (reuse SMTP config) ----
export async function sendEmailNotification(to: string, subject: string, html: string) {
  const config = await prisma.smtpConfig.findFirst();
  if (!config || !config.host) throw new Error("SMTP not configured");

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    html,
  });
}

// ---- Main dispatcher ----
export async function sendToAllChannels(
  userId: number,
  type: "event" | "period" | "anniversary",
  refId: string,
  title: string,
  body: string
): Promise<number> {
  const config = await prisma.notificationConfig.findUnique({ where: { userId } });
  if (!config) return 0;

  // Check if already sent for this ref
  const existing = await prisma.notificationLog.findFirst({
    where: { userId, type, refId },
  });
  if (existing) return 0;

  const channels: string[] = [];

  // Email
  if (config.emailEnabled) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await sendEmailNotification(user.email, title, body.replace(/\n/g, "<br>"));
        channels.push("email");
      }
    } catch (err) {
      console.error(`[Notify] Email failed for user ${userId}:`, err);
    }
  }

  // Bark
  if (config.barkEnabled && config.barkToken) {
    try {
      await sendBarkNotification(config.barkToken, title, body);
      channels.push("bark");
    } catch (err) {
      console.error(`[Notify] Bark failed for user ${userId}:`, err);
    }
  }

  // ServerChan
  if (config.serverChanEnabled && config.serverChanKey) {
    try {
      await sendServerChanNotification(config.serverChanKey, title, body);
      channels.push("serverchan");
    } catch (err) {
      console.error(`[Notify] ServerChan failed for user ${userId}:`, err);
    }
  }

  // DingTalk
  if (config.dingTalkEnabled && config.dingTalkUrl) {
    try {
      await sendDingTalkNotification(config.dingTalkUrl, body);
      channels.push("dingtalk");
    } catch (err) {
      console.error(`[Notify] DingTalk failed for user ${userId}:`, err);
    }
  }

  // WeCom
  if (config.weComEnabled && config.weComUrl) {
    try {
      await sendWeComNotification(config.weComUrl, body);
      channels.push("wecom");
    } catch (err) {
      console.error(`[Notify] WeCom failed for user ${userId}:`, err);
    }
  }

  // Webhook
  if (config.webhookEnabled && config.webhookUrl) {
    try {
      await sendWebhookNotification(config.webhookUrl, title, body);
      channels.push("webhook");
    } catch (err) {
      console.error(`[Notify] Webhook failed for user ${userId}:`, err);
    }
  }

  if (channels.length > 0) {
    await prisma.notificationLog.create({
      data: { userId, type, refId, channels: JSON.stringify(channels), title, body },
    });
  }

  return channels.length;
}
