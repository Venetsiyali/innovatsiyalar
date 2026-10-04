import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default async function NotificationsPage() {
  const session = (await auth())!;
  const userId = session.user.id;
  const items = await db.notification.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  async function markAll() {
    "use server";
    const s = await auth();
    if (!s?.user) return;
    await db.notification.updateMany({ where: { userId: s.user.id, isRead: false }, data: { isRead: true } });
    revalidatePath("/", "layout");
  }

  return (
    <>
      <PageHeader title={t("notifications.title")}>
        {items.some((n) => !n.isRead) && (
          <form action={markAll}>
            <Button type="submit" variant="outline">{t("notifications.markAll")}</Button>
          </form>
        )}
      </PageHeader>
      {items.length === 0 ? (
        <p className="text-muted">{t("notifications.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((n) => (
            <li key={n.id}>
              <a href={`/api/notifications/${n.id}/open`} className={cn("flex gap-3 p-3 hover:bg-accent/40", !n.isRead && "bg-accent/50")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
                <span className="flex-1">
                  <span className={cn("block text-sm", !n.isRead && "font-medium")}>{n.message}</span>
                  <span className="text-xs text-muted">{formatDateTime(n.createdAt)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
