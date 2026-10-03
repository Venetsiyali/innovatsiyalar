import "server-only";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";

type Who = { id: string; role: Role };

/** Admin, or a teacher assigned to the course. */
export async function canManageCourse(user: Who, courseId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  return (await db.courseTeacher.count({ where: { courseId, userId: user.id, deletedAt: null } })) > 0;
}

/** Managers, or students enrolled in a group that studies the course. */
export async function canViewCourse(user: Who, courseId: string): Promise<boolean> {
  if (await canManageCourse(user, courseId)) return true;
  if (user.role !== "STUDENT") return false;
  const n = await db.courseGroup.count({
    where: {
      courseId,
      deletedAt: null,
      group: { deletedAt: null, enrollments: { some: { userId: user.id, deletedAt: null, status: "ACTIVE" } } },
    },
  });
  return n > 0;
}

/** Students only see modules that are not hidden and whose opening date has passed. */
export function isModuleOpen(m: { isHidden: boolean; opensAt: Date | null }, now = new Date()): boolean {
  return !m.isHidden && (!m.opensAt || m.opensAt <= now);
}
