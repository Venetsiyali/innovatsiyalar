import { GradebookTable } from "@/components/gradebook-table";

export default async function TeacherCourseGradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const [{ courseId }, { group }] = await Promise.all([params, searchParams]);
  return <GradebookTable courseId={courseId} groupId={group} />;
}
