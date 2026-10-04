import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { appUrl, mailEnabled, sendMail } from "@/lib/mail";

export type NotificationInput = { userId: string; type: string; message: string; link?: string | null };

// TZ 4.8: these events are also emailed.
const EMAIL_TYPES = new Set(["assignment_new", "deadline_reminder", "grade", "schedule_change", "announcement"]);

/**
 * Create in-app notifications (bell) and, when SMTP is configured, email them.
 * Emails go out after the response is sent so actions stay fast.
 */
export async function notifyUsers(rows: NotificationInput[], subject?: string): Promise<number> {
  if (!rows.length) return 0;
  const { count } = await db.notification.createMany({
    data: rows.map((r) => ({ userId: r.userId, type: r.type, message: r.message, link: r.link ?? null })),
  });

  const emailRows = rows.filter((r) => EMAIL_TYPES.has(r.type));
  if (mailEnabled() && emailRows.length) {
    after(async () => {
      const users = await db.user.findMany({
        where: { id: { in: [...new Set(emailRows.map((r) => r.userId))] }, isActive: true, deletedAt: null },
        select: { id: true, email: true },
      });
      const emailOf = new Map(users.map((u) => [u.id, u.email]));
      for (const r of emailRows) {
        const to = emailOf.get(r.userId);
        // Placeholder addresses generated from the timetable can't receive mail.
        if (to) await sendMail(to, subject ?? `IUSI LMS: ${r.message.slice(0, 70)}`, r.message, r.link ? appUrl(r.link) : undefined);
      }
    });
  }
  return count;
}

/** Email login credentials to a new (or reset) account, after the response. Returns whether mail is on. */
export function emailCredentials(users: { email: string; fullName: string; password: string }[], texts: { subject: string; body: (u: { fullName: string; email: string; password: string }) => string }) {
  if (!mailEnabled() || !users.length) return false;
  after(async () => {
    for (const u of users) await sendMail(u.email, texts.subject, texts.body(u), appUrl("/login"));
  });
  return true;
}
