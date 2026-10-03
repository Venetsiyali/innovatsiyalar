import { auth } from "@/auth";
import { t } from "@/lib/i18n";

export default async function TeacherDashboard() {
  const session = await auth();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{t("dashboard.welcome", { name: session?.user.name ?? "" })}</h1>
      <p className="text-muted">{t("dashboard.comingSoon")}</p>
    </div>
  );
}
