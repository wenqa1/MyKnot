import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import prisma from "../db/prisma.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

function generateCode(): string {
  if (process.env.NODE_ENV === "development") {
    return "123456";
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const buf = scryptSync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  return timingSafeEqual(buf, hashBuf);
}

// POST /auth/send-code
router.post("/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    const recent = await prisma.verificationCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      const elapsed = Date.now() - recent.createdAt.getTime();
      if (elapsed < 60000) {
        res
          .status(429)
          .json({ error: "Please wait 60 seconds before requesting a new code" });
        return;
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: { email, code, expiresAt },
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Verification code for ${email}: ${code}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("send-code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/verify
router.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: "Email and code are required" });
      return;
    }

    const record = await prisma.verificationCode.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.code !== code) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    if (new Date() > record.expiresAt) {
      res.status(400).json({ error: "Code has expired" });
      return;
    }

    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    const token = signToken({ id: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasPassword: !!user.password,
      },
    });
  } catch (err) {
    console.error("verify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login (email + password)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      res.status(400).json({ error: "账号未设置密码，请使用验证码登录" });
      return;
    }

    if (!verifyPassword(password, user.password)) {
      res.status(400).json({ error: "密码错误" });
      return;
    }

    const token = signToken({ id: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasPassword: true,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /auth/set-password
router.put("/set-password", requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashPassword(password) },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("set-password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatar: true, password: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      hasPassword: !!user.password,
    });
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
