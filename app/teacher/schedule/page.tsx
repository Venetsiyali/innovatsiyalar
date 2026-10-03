import { auth } from "@/auth";
import { MySchedule } from "@/components/my-schedule";

export default async function TeacherSchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const [{ week }, session] = await Promise.all([searchParams, auth()]);
  const id = session!.user.id;
  return <MySchedule filter={{ teacherId: id }} mode="teacher" week={week} exportHref={`/api/schedule/export?view=teacher&id=${id}`} />;
}
