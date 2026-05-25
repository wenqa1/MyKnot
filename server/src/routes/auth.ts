import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import prisma from "../db/prisma.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/email.js";

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

    // Try sending via SMTP, fallback to console
    try {
      await sendVerificationEmail(email, code);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Verification code for ${email}: ${code}`);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("send-code error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function verifyCode(email: string, code: string): Promise<boolean> {
  return prisma.verificationCode
    .findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    })
    .then((record) => {
      if (!record || record.code !== code) return false;
      if (new Date() > record.expiresAt) return false;
      return prisma.verificationCode
        .update({ where: { id: record.id }, data: { used: true } })
        .then(() => true);
    });
}

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, code } = req.body;

    if (!username || username.length < 3 || username.length > 20) {
      res.status(400).json({ error: "Username must be 3-20 characters" });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: "Username can only contain letters, numbers and underscores" });
      return;
    }
    if (!password || password.length < 3) {
      res.status(400).json({ error: "Password must be at least 3 characters" });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    if (!code || code.length !== 6) {
      res.status(400).json({ error: "Verification code is required" });
      return;
    }

    const valid = await verifyCode(email, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired verification code" });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existingUser) {
      res.status(400).json({
        error: existingUser.username === username
          ? "Username already taken"
          : "Email already registered",
      });
      return;
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashPassword(password),
      },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar ? `/uploads/avatars/${user.avatar}` : null,
        hasPassword: true,
        role: user.role,
        spaceId: user.spaceId,
      },
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      res.status(400).json({ error: "Account and password are required" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: account }, { email: account }],
      },
    });

    if (!user || !user.password) {
      res.status(400).json({ error: "账号或密码错误" });
      return;
    }

    if (!verifyPassword(password, user.password)) {
      res.status(400).json({ error: "账号或密码错误" });
      return;
    }

    if (user.disabled) {
      res.status(401).json({ error: "Account disabled" });
      return;
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar ? `/uploads/avatars/${user.avatar}` : null,
        hasPassword: true,
        role: user.role,
        spaceId: user.spaceId,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/verify (keep for backward compat / password reset verification)
router.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: "Email and code are required" });
      return;
    }

    const valid = await verifyCode(email, code);
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    res.json({ ok: true, verified: true });
  } catch (err) {
    console.error("verify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /auth/set-password
router.put("/set-password", requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 3) {
      res.status(400).json({ error: "Password must be at least 3 characters" });
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
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatar: true,
        password: true,
        role: true,
        spaceId: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: user.avatar ? `/uploads/avatars/${user.avatar}` : null,
      hasPassword: !!user.password,
      role: user.role,
      spaceId: user.spaceId,
    });
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
