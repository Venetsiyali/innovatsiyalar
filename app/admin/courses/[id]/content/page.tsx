import { CoursePage } from "@/components/course-pages";

export default async function AdminCourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoursePage courseId={id} manage />;
}
