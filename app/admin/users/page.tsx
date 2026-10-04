import type { Prisma, Role } from "@prisma/client";
import Link from "next/link";
import { FileSpreadsheet, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

const PAGE_SIZE = 50;
const ROLES: Role[] = ["ADMIN", "TEACHER", "STUDENT"];

type Search = { q?: string; role?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", role = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(ROLES.includes(role as Role) && { role: role as Role }),
    ...(q && {
      OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
    }),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
        enrollments: { where: { deletedAt: null }, select: { group: { select: { name: true } } } },
      },
    }),
    db.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => `?${new URLSearchParams({ q, role, page: String(p) })}`;

  return (
    <>
      <PageHeader title={t("users.title")}>
        <a href={`/api/admin/users/export?${new URLSearchParams({ q, role })}`}>
          <Button variant="outline">
            <FileSpreadsheet className="size-4" />
            {t("users.export")}
          </Button>
        </a>
        <Link href="/admin/users/import">
          <Button variant="outline">
            <Upload className="size-4" />
            {t("users.import")}
          </Button>
        </Link>
        <Link href="/admin/users/new">
          <Button>
            <Plus className="size-4" />
            {t("users.new")}
          </Button>
        </Link>
      </PageHeader>

      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder={t("users.searchPlaceholder")} className="max-w-xs" />
        <Select name="role" defaultValue={role} className="w-44">
          <option value="">{t("common.all")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </Select>
        <Button variant="outline" type="submit">
          {t("common.filter")}
        </Button>
      </form>

      <Table>
        <thead>
          <tr>
            <Th>{t("users.fullName")}</Th>
            <Th>{t("users.email")}</Th>
            <Th>{t("users.role")}</Th>
            <Th>{t("users.group")}</Th>
            <Th>{t("users.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-accent/40">
              <Td>
                <Link href={`/admin/users/${u.id}`} className="font-medium text-primary hover:underline">
                  {u.fullName}
                </Link>
              </Td>
              <Td className="text-muted">{u.email}</Td>
              <Td>{t(`roles.${u.role}`)}</Td>
              <Td>{u.enrollments.map((e) => e.group.name).join(", ") || t("common.none")}</Td>
              <Td>
                {!u.isActive ? (
                  <Badge tone="red">{t("users.inactive")}</Badge>
                ) : !u.passwordHash ? (
                  <Badge tone="gray">{t("users.noPassword")}</Badge>
                ) : (
                  <Badge tone="green">{t("users.active")}</Badge>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{t("common.total", { count: total })}</span>
        <div className="flex items-center gap-2">
          {pageNum > 1 && <Link href={pageHref(pageNum - 1)}>{t("common.prev")}</Link>}
          <span>
            {pageNum} / {pages}
          </span>
          {pageNum < pages && <Link href={pageHref(pageNum + 1)}>{t("common.next")}</Link>}
        </div>
      </div>
    </>
  );
}
