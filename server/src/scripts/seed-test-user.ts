import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import prisma from "../db/prisma.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const testUser = await prisma.user.upsert({
    where: { username: "001" },
    create: {
      username: "001",
      email: "001@myknot.local",
      password: hashPassword("001"),
      role: "user",
    },
    update: {},
  });

  console.log(`Test account ready: ${testUser.username} / 001`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
