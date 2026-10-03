import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { canManageCourse } from "@/lib/course-access";
import { CATEGORIES, computeGradebook } from "@/lib/gradebook";
import { t } from "@/lib/i18n";
import { slugify } from "@/lib/schedule-import/normalize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  const { courseId } = await params;
  if (!session?.user || !(await canManageCourse(session.user, courseId))) {
    return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
  }
  const { course, assignments, rows } = await computeGradebook(courseId, { groupId: req.nextUrl.searchParams.get("group") ?? undefined });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t("gradebook.title"));
  ws.addRow([`${t("gradebook.title")}: ${course.name}`]).font = { bold: true, size: 14 };
  const header = ws.addRow([
    t("gradebook.student"),
    t("gradebook.group"),
    ...assignments.map((a) => `${a.title} (${t(`assignments.${a.category}`)}, ${a.maxScore})`),
    ...CATEGORIES.map((c) => `${t(`assignments.${c}`)} %`),
    t("gradebook.total"),
    `${t("gradebook.attendance")} %`,
    t("gradebook.absences"),
  ]);
  header.font = { bold: true };
  header.alignment = { wrapText: true, vertical: "top" };
  for (const r of rows) {
    ws.addRow([
      r.fullName,
      r.group,
      ...assignments.map((a) => (r.cells[a.id] === undefined ? "" : (r.cells[a.id]?.effective ?? ""))),
      ...CATEGORIES.map((c) => r.categoryPct[c] ?? ""),
      r.total ?? "",
      r.attendancePct ?? "",
      r.absences,
    ]);
  }
  ws.columns.forEach((c, i) => (c.width = i < 2 ? 28 : 14));

  return new NextResponse((await wb.xlsx.writeBuffer()) as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="jurnal-${slugify(course.name) || "fan"}.xlsx"`,
    },
  });
}
