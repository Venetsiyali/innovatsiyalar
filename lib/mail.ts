import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// University SMTP (TZ 6). Without SMTP_HOST the system still works — only in-app notifications.
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return (transporter = null);
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export function mailEnabled(): boolean {
  return !!process.env.SMTP_HOST;
}

/** Absolute link for emails. */
export function appUrl(path = "/"): string {
  const base =
    process.env.APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return new URL(path, base).toString();
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Send one email; never throws (a mail outage must not break the action that triggered it). */
export async function sendMail(to: string, subject: string, text: string, link?: string): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
<p>${escape(text).replace(/\n/g, "<br>")}</p>
${link ? `<p><a href="${escape(link)}" style="color:#1e3a8a">${escape(link)}</a></p>` : ""}
<p style="color:#64748b;font-size:12px">IUSI LMS</p></div>`;
  try {
    await tx.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to, subject, text: link ? `${text}\n\n${link}` : text, html });
    return true;
  } catch (e) {
    console.error("[mail] send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
