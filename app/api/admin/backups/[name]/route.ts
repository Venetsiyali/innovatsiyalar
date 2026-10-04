import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BACKUP_PREFIX } from "@/lib/backup";
import { t } from "@/lib/i18n";
import { listStored, openStored } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
  const { name } = await params;
  const item = (await listStored(BACKUP_PREFIX)).find((b) => b.key === BACKUP_PREFIX + name);
  const file = item && (await openStored(item.url));
  if (!file) return NextResponse.json({ error: t("common.notFound") }, { status: 404 });
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
    },
  });
}
