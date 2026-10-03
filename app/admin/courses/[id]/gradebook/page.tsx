import { GradebookTable } from "@/components/gradebook-table";

export default async function AdminCourseGradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const [{ id }, { group }] = await Promise.all([params, searchParams]);
  return <GradebookTable courseId={id} groupId={group} />;
}
