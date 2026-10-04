import "server-only";
import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/roles";
import { t } from "@/lib/i18n";

/** For pages/layouts open to every role: signed in and past the forced password change. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  return session;
}

/** For pages/layouts: ensure the user is signed in with the given role (server-side). */
export async function requireRole(role: Role) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  if (session.user.role !== role) redirect(ROLE_HOME[session.user.role]);
  return session;
}

/**
 * For server actions: actions are public POST endpoints, so every one must
 * re-check the caller's role. Throws (→ error boundary) instead of redirecting.
 */
export async function assertRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user || !roles.includes(session.user.role)) throw new Error(t("errors.forbidden"));
  return session;
}

/** For API routes: returns the session, or a 401/403 response to send back. */
export async function apiRequireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 }) } as const;
  }
  if (!roles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: t("errors.forbidden") }, { status: 403 }) } as const;
  }
  return { session } as const;
}
