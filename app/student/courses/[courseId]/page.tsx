import { CoursePage } from "@/components/course-pages";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CoursePage courseId={courseId} manage={false} />;
}
