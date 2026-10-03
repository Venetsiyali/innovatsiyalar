import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { saveCourseAction } from "../actions";
import { CourseFields } from "../course-fields";

export default function NewCoursePage() {
  return (
    <>
      <PageHeader title={t("courses.new")} />
      <Card className="max-w-2xl p-6">
        <ActionForm action={saveCourseAction.bind(null, null)}>
          <CourseFields />
          <Button type="submit">{t("common.create")}</Button>
        </ActionForm>
      </Card>
    </>
  );
}
