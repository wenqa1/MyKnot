import type { Request } from "express";
import prisma from "../db/prisma.js";

export async function getSharedUserIds(req: Request): Promise<number[]> {
  if (!req.userSpaceId) {
    return [req.userId!];
  }
  const users = await prisma.user.findMany({
    where: { spaceId: req.userSpaceId },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
