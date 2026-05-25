import nodemailer from "nodemailer";
import prisma from "../db/prisma.js";

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const config = await prisma.smtpConfig.findFirst();
  if (!config || !config.host) {
    throw new Error("SMTP not configured");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject: "MyKnot 验证码",
    html: `
      <div style="max-width:400px;margin:0 auto;padding:30px;font-family:Arial,sans-serif">
        <h2 style="color:#fb7185">MyKnot</h2>
        <p>你的验证码是：</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#333">${code}</p>
        <p style="color:#999;font-size:12px">有效期 10 分钟，请勿透露给他人</p>
      </div>
    `,
  });
}

export async function sendTestEmail(to: string): Promise<void> {
  const config = await prisma.smtpConfig.findFirst();
  if (!config || !config.host) {
    throw new Error("SMTP not configured");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject: "MyKnot SMTP 测试邮件",
    html: `<p>这是一封测试邮件，SMTP 配置正确！</p>`,
  });
}
