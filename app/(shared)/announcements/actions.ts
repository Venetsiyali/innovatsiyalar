"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { userGroupIds } from "@/lib/announcements";
import { db } from "@/lib/db";
import { str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { notifyUsers } from "@/lib/notify";

/** TZ 4.8: admin → everyone or chosen groups; teacher → only their own groups. */
export async function sendAnnouncementAction(_p: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "ADMIN" && user.role !== "TEACHER")) return { error: t("errors.forbidden") };

  const title = str(fd, "title");
  const body = str(fd, "body");
  if (!title || !body) return { error: t("common.required") };
  const scope = user.role === "ADMIN" && str(fd, "scope") === "ALL" ? "ALL" : "GROUPS";

  const allowed = new Set(await userGroupIds(user));
  const groupIds = scope === "GROUPS" ? fd.getAll("groupIds").map(String).filter((g) => allowed.has(g)) : [];
  if (scope === "GROUPS" && !groupIds.length) return { error: t("announcements.noGroups") };

  const announcement = await db.announcement.create({ data: { authorId: user.id, title, body, scope, groupIds } });

  const live = { deletedAt: null, isActive: true };
  const recipients =
    scope === "ALL"
      ? await db.user.findMany({ where: { ...live, id: { not: user.id } }, select: { id: true } })
      : await db.user.findMany({
          where: { ...live, role: "STUDENT", enrollments: { some: { groupId: { in: groupIds }, deletedAt: null, status: "ACTIVE" } } },
          select: { id: true },
        });
  const count = await notifyUsers(
    recipients.map((r) => ({ userId: r.id, type: "announcement", message: `${title}: ${body.slice(0, 200)}`, link: `/announcements#${announcement.id}` })),
    `IUSI LMS: ${title}`,
  );
  revalidatePath("/announcements");
  return { success: t("announcements.sent", { count }) };
}
