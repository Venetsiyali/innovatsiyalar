import type { Role } from "@prisma/client";

// Edge-safe: no runtime Prisma imports here (used by middleware).
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

/** Which role a protected path prefix belongs to, or null if not role-scoped. */
export function roleForPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/teacher")) return "TEACHER";
  if (pathname.startsWith("/student")) return "STUDENT";
  return null;
}
