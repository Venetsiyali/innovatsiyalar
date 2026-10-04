import ExcelJS from "exceljs";
import type { Prisma, Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });

  const role = req.nextUrl.searchParams.get("role") ?? "";
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(["ADMIN", "TEACHER", "STUDENT"].includes(role) && { role: role as Role }),
    ...(q && { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }),
  };
  const users = await db.user.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      fullName: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      enrollments: { where: { deletedAt: null }, select: { group: { select: { name: true } } } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t("users.title"));
  ws.addRow([t("users.fullName"), t("users.email"), t("users.role"), t("users.group"), t("users.phone"), t("users.status"), t("users.lastLogin")]).font = { bold: true };
  for (const u of users) {
    ws.addRow([
      u.fullName,
      u.email,
      t(`roles.${u.role}`),
      u.enrollments.map((e) => e.group.name).join(", "),
      u.phone ?? "",
      t(u.isActive ? "users.active" : "users.inactive"),
      u.lastLoginAt?.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" }) ?? "",
    ]);
  }
  ws.columns.forEach((c, i) => (c.width = [32, 32, 14, 20, 18, 10, 20][i]));
  return new NextResponse((await wb.xlsx.writeBuffer()) as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="foydalanuvchilar.xlsx"',
    },
  });
}
