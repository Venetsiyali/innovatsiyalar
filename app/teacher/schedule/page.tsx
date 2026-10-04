import Link from "next/link";
import { auth } from "@/auth";
import { MySchedule } from "@/components/my-schedule";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default async function TeacherSchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const [{ week }, session] = await Promise.all([searchParams, auth()]);
  const id = session!.user.id;
  return (
    <>
      <MySchedule
        filter={{ teacherId: id }}
        mode="teacher"
        week={week}
        exportHref={`/api/schedule/export?view=teacher&id=${id}`}
        hrefFor={(s) => `/teacher/schedule/propose/${s.id}`}
        extra={
          <Link href="/teacher/schedule/proposals">
            <Button variant="outline">{t("proposals.mine")}</Button>
          </Link>
        }
      />
      <p className="mt-3 text-sm text-muted print:hidden">{t("proposals.hint")}</p>
    </>
  );
}
