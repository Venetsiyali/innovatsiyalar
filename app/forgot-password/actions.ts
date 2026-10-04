"use server";

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { appUrl, mailEnabled, sendMail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";

const TOKEN_TTL_MS = 60 * 60 * 1000; // TZ 4.1: the link is valid for 1 hour
export const hashToken = async (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestResetAction(_p: FormState, fd: FormData): Promise<FormState> {
  if (!mailEnabled()) return { error: t("forgot.noMail") };
  const email = str(fd, "email").toLowerCase();
  const user = await db.user.findFirst({ where: { email, deletedAt: null, isActive: true } });
  // Same answer whether or not the account exists (no account enumeration).
  if (user) {
    const recent = await db.passwordResetToken.count({
      where: { userId: user.id, usedAt: null, createdAt: { gt: new Date(Date.now() - 2 * 60_000) } },
    });
    if (!recent) {
      const token = randomBytes(32).toString("hex");
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: await hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      });
      await sendMail(user.email, t("mail.resetSubject"), t("mail.resetBody"), appUrl(`/reset-password?token=${token}`));
    }
  }
  return { success: t("forgot.sent") };
}

export async function resetPasswordAction(token: string, _p: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password");
  if (password.length < 8) return { error: t("password.tooShort") };
  if (password !== str(fd, "confirm")) return { error: t("password.mismatch") };

  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: await hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return { error: t("forgot.invalid") };

  await db.$transaction([
    db.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password), mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
    }),
    // One-time: burn this token and any other open ones for the user.
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  return { success: t("forgot.done") };
}
