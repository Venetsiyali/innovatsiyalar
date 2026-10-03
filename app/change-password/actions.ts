"use server";

import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { hashPassword } from "@/lib/password";

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: t("errors.unauthorized") };

  const current = str(fd, "current");
  const next = str(fd, "next");
  if (next.length < 8) return { error: t("password.tooShort") };
  if (next !== str(fd, "confirm")) return { error: t("password.mismatch") };
  if (next === current) return { error: t("password.same") };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: t("password.wrongCurrent") };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  // The JWT still carries mustChangePassword=true; sign in again for a fresh token.
  await signOut({ redirectTo: "/login?changed=1" });
  return {};
}
