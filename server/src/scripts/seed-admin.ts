import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import prisma from "../db/prisma.js";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // Create default admin account: admin / admin
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      email: process.env.ADMIN_EMAIL || "admin@myknot.local",
      password: hashPassword("admin"),
      role: "admin",
    },
    update: {
      role: "admin",
    },
  });

  console.log(`Admin account ready: ${admin.username} / admin`);
  console.log(`Email: ${admin.email}`);
  console.log("Change the password after first login!");

  // Also check ADMIN_EMAIL for promoting an existing user
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && adminEmail !== admin.email) {
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (user && user.username !== "admin") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "admin" },
      });
      console.log(`User ${adminEmail} is now an admin.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
