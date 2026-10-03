import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { activeSemester, findSlots, type SlotFilter } from "@/lib/schedule";
import { slugify } from "@/lib/schedule-import/normalize";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });

  const view = req.nextUrl.searchParams.get("view");
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { role, id: userId } = session.user;

  // Ownership check on the server: teachers export only their own, students only their groups.
  let filter: SlotFilter;
  if (view === "group") {
    const own =
      role === "ADMIN" ||
      (role === "STUDENT" && (await db.enrollment.count({ where: { userId, groupId: id, deletedAt: null } })) > 0);
    if (!own) return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
    filter = { groupIds: [id] };
  } else if (view === "teacher") {
    if (role !== "ADMIN" && !(role === "TEACHER" && id === userId)) {
      return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
    }
    filter = { teacherId: id };
  } else if (view === "room" && role === "ADMIN") {
    filter = { roomId: id };
  } else {
    return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
  }

  const semester = await activeSemester();
  const slots = semester ? await findSlots(semester.id, filter) : [];
  const title =
    view === "group"
      ? (await db.group.findUnique({ where: { id } }))?.name
      : view === "teacher"
        ? (await db.user.findUnique({ where: { id } }))?.fullName
        : (await db.room.findUnique({ where: { id } }))?.name;

  const periods = [...new Map(slots.map((s) => [s.periodId, s.period])).values()].sort((a, b) =>
    a.startTime.localeCompare(b.startTime, undefined, { numeric: true }),
  );
  const days = [1, 2, 3, 4, 5, ...(slots.some((s) => s.dayOfWeek === 6) ? [6] : [])];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t("schedule.title"));
  ws.addRow([`${t("schedule.title")}: ${title ?? ""}`]).font = { bold: true, size: 14 };
  ws.addRow([semester?.name ?? ""]);
  const header = ws.addRow([t("schedule.period"), ...days.map((d) => t(`days.${d}`))]);
  header.font = { bold: true };
  for (const p of periods) {
    const row = ws.addRow([
      `${p.number}-para\n${p.startTime}–${p.endTime}`,
      ...days.map((d) =>
        slots
          .filter((s) => s.dayOfWeek === d && s.periodId === p.id)
          .map((s) =>
            [
              s.course.name,
              view !== "group" && s.group.name,
              view !== "teacher" && s.teacher?.fullName,
              view !== "room" && s.room && `${t("schedule.room")}: ${s.room.name}`,
              s.alternating && `(${t("schedule.alternatingShort")})`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n"),
      ),
    ]);
    row.alignment = { wrapText: true, vertical: "top" };
  }
  ws.columns.forEach((c, i) => (c.width = i === 0 ? 14 : 30));

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `jadval-${slugify(title ?? "export") || "export"}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
