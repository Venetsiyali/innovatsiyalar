"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { ROLE_HOME } from "@/lib/roles";

export type LoginState = { error: string | null; email: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  try {
    await signIn("credentials", { email, password: formData.get("password"), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = "code" in error ? error.code : undefined;
      // Echo the email back so the form keeps it after React resets the inputs.
      return { error: code === "locked" ? t("auth.locked") : t("auth.invalid"), email };
    }
    throw error;
  }
  // Send the user straight to their role home (middleware does not run on action redirects).
  const user = await db.user.findUnique({ where: { email }, select: { role: true } });
  redirect(user ? ROLE_HOME[user.role] : "/login");
}
