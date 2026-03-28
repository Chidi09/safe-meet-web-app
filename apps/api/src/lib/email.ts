// ============================================================
// apps/api/src/lib/email.ts
//
// Brevo SMTP email sender.
// Gracefully no-ops when SMTP env vars are not set.
// ============================================================

import nodemailer from "nodemailer";

const smtpHost = process.env["SMTP_HOST"];
const smtpPort = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
const smtpUser = process.env["SMTP_USER"];
const smtpPass = process.env["SMTP_PASS"];
const fromAddress = process.env["SMTP_FROM"] ?? "SafeMeet <noreply@safe-meet.click>";

const emailEnabled = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = emailEnabled
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!transporter) return;
  await transporter.sendMail({ from: fromAddress, ...opts });
}
