import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";

const live = { deletedAt: null };

/** Groups a user belongs to: students via enrollment, teachers via the courses they teach. */
export async function userGroupIds(user: { id: string; role: Role }): Promise<string[]> {
  if (user.role === "STUDENT") {
    const rows = await db.enrollment.findMany({ where: { userId: user.id, ...live, status: "ACTIVE" }, select: { groupId: true } });
    return rows.map((r) => r.groupId);
  }
  if (user.role === "TEACHER") {
    const rows = await db.courseGroup.findMany({
      where: { ...live, group: live, course: { ...live, teachers: { some: { userId: user.id, ...live } } } },
      select: { groupId: true },
    });
    return [...new Set(rows.map((r) => r.groupId))];
  }
  return (await db.group.findMany({ where: live, select: { id: true } })).map((g) => g.id);
}

export async function visibleAnnouncementsWhere(user: { id: string; role: Role }): Promise<Prisma.AnnouncementWhereInput> {
  if (user.role === "ADMIN") return live;
  const groups = await userGroupIds(user);
  return { ...live, OR: [{ scope: "ALL" }, { authorId: user.id }, { scope: "GROUPS", groupIds: { hasSome: groups } }] };
}
