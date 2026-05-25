import { addDays, startOfDay, differenceInDays } from "date-fns";
import prisma from "../db/prisma.js";
import { sendToAllChannels } from "./notifications.js";

function getSharedUserIds(spaceId: number | null, ownId: number): Promise<number[]> {
  if (!spaceId) return Promise.resolve([ownId]);
  return prisma.user.findMany({
    where: { spaceId },
    select: { id: true },
  }).then((users) => users.map((u) => u.id));
}

// Calculate next occurrence of a yearly event from today
function getNextOccurrence(eventDate: Date): Date {
  const today = startOfDay(new Date());
  const thisYear = new Date(today.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  if (thisYear >= today) return thisYear;
  return new Date(today.getFullYear() + 1, eventDate.getMonth(), eventDate.getDate());
}

// Calculate next period start from records
function getNextPeriodStart(config: { cycleDays: number; periodDays: number }, records: { startDate: Date }[]): Date | null {
  if (records.length === 0) return null;
  const sorted = records.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  const lastStart = startOfDay(sorted[0].startDate);
  return addDays(lastStart, config.cycleDays);
}

export async function checkAndNotifyForUser(userId: number): Promise<number> {
  const config = await prisma.notificationConfig.findUnique({ where: { userId } });
  if (!config) return 0;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const userIds = await getSharedUserIds(user.spaceId, userId);
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, config.advanceDays);
  let totalSent = 0;

  // 1. Check events (special dates)
  if (config.notifyOnEvent) {
    const events = await prisma.event.findMany({
      where: { userId: { in: userIds } },
    });

    for (const event of events) {
      const eventDate = startOfDay(event.date);
      let targetDate: Date;

      if (event.recurrence === "yearly") {
        targetDate = getNextOccurrence(eventDate);
      } else {
        targetDate = eventDate;
      }

      if (targetDate >= today && targetDate <= windowEnd) {
        const refId = `event-${event.id}`;
        const daysUntil = differenceInDays(targetDate, today);
        const title = `📅 ${event.name}`;
        const body = daysUntil === 0
          ? `${event.name} 就在今天！`
          : `${event.name} 还有 ${daysUntil} 天 (${targetDate.toLocaleDateString("zh-CN")})`;

        const sent = await sendToAllChannels(userId, "event", refId, title, body);
        totalSent += sent;

        // Also notify partner
        const partnerIds = userIds.filter((id) => id !== userId);
        for (const pid of partnerIds) {
          const s = await sendToAllChannels(pid, "event", refId, title, body);
          totalSent += s;
        }
      }
    }
  }

  // 2. Check period prediction
  if (config.notifyOnPeriod) {
    const periodConfig = await prisma.periodConfig.findFirst({
      where: { userId: { in: userIds } },
    });
    const records = await prisma.periodRecord.findMany({
      where: { userId: { in: userIds } },
      select: { startDate: true },
    });

    if (periodConfig && records.length > 0) {
      const nextStart = getNextPeriodStart(periodConfig, records);
      if (nextStart && nextStart >= today && nextStart <= windowEnd) {
        const refId = `period-${nextStart.toISOString().slice(0, 10)}`;
        const daysUntil = differenceInDays(nextStart, today);
        const title = "🩸 经期预测";
        const body = daysUntil === 0
          ? "经期预计今天开始"
          : `经期预计 ${daysUntil} 天后开始 (${nextStart.toLocaleDateString("zh-CN")})`;

        const sent = await sendToAllChannels(userId, "period", refId, title, body);
        totalSent += sent;

        const partnerIds = userIds.filter((id) => id !== userId);
        for (const pid of partnerIds) {
          const s = await sendToAllChannels(pid, "period", refId, title, body);
          totalSent += s;
        }
      }
    }
  }

  // 3. Check anniversary
  if (config.notifyOnAnniversary) {
    let anniversaryDate: Date | null = null;

    if (user.spaceId) {
      const space = await prisma.space.findUnique({ where: { id: user.spaceId } });
      if (space?.relationshipStartDate) anniversaryDate = space.relationshipStartDate;
    } else {
      const profile = await prisma.profile.findUnique({ where: { userId } });
      if (profile?.relationshipStartDate) anniversaryDate = profile.relationshipStartDate;
    }

    if (anniversaryDate) {
      const nextAnniversary = getNextOccurrence(anniversaryDate);
      if (nextAnniversary >= today && nextAnniversary <= windowEnd) {
        const years = today.getFullYear() - anniversaryDate.getFullYear();
        const refId = `anniversary-${nextAnniversary.getFullYear()}`;
        const daysUntil = differenceInDays(nextAnniversary, today);
        const title = "❤️ 纪念日";
        const body = daysUntil === 0
          ? `今天是你和TA的 ${years} 周年纪念日！`
          : `你和TA的 ${years} 周年纪念日还有 ${daysUntil} 天 (${nextAnniversary.toLocaleDateString("zh-CN")})`;

        const sent = await sendToAllChannels(userId, "anniversary", refId, title, body);
        totalSent += sent;

        const partnerIds = userIds.filter((id) => id !== userId);
        for (const pid of partnerIds) {
          const s = await sendToAllChannels(pid, "anniversary", refId, title, body);
          totalSent += s;
        }
      }
    }
  }

  return totalSent;
}

// Run check for all users whose notifyTime matches current time
export async function checkAllUsersScheduled(): Promise<number> {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  // Find all configs with matching notifyTime
  const configs = await prisma.notificationConfig.findMany({
    where: { notifyTime: timeStr },
  });

  let total = 0;
  for (const config of configs) {
    const sent = await checkAndNotifyForUser(config.userId);
    total += sent;
  }
  return total;
}
