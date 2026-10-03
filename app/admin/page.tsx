import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function AdminDashboard() {
  const session = await auth();
  const live = { deletedAt: null };
  const [groups, courses, teachers, slots] = await Promise.all([
    db.group.count({ where: live }),
    db.course.count({ where: live }),
    db.user.count({ where: { ...live, role: "TEACHER" } }),
    db.scheduleSlot.count({ where: live }),
  ]);
  const stats = [
    ["dashboard.stats.groups", groups],
    ["dashboard.stats.courses", courses],
    ["dashboard.stats.teachers", teachers],
    ["dashboard.stats.slots", slots],
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.welcome", { name: session?.user.name ?? "" })}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([key, value]) => (
          <Card key={key} className="p-4">
            <p className="text-sm text-muted">{t(key)}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
