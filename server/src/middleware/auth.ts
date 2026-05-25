import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userEmail?: string;
      userRole?: string;
      userSpaceId?: number | null;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "knot-dev-secret";

export function signToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as {
      sub: number;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, spaceId: true, disabled: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.disabled) {
      res.status(401).json({ error: "Account disabled" });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.userRole = user.role;
    req.userSpaceId = user.spaceId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
