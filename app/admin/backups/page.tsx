import { revalidatePath } from "next/cache";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { BACKUP_PREFIX, createBackup } from "@/lib/backup";
import { formatDateTime } from "@/lib/dates";
import { formatSize } from "@/lib/files";
import type { FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { assertRole } from "@/lib/permissions";
import { listStored } from "@/lib/storage";

export const maxDuration = 300;

async function backupNow(_p: FormState, _fd: FormData): Promise<FormState> {
  "use server";
  await assertRole("ADMIN");
  const r = await createBackup();
  revalidatePath("/admin/backups");
  return { success: t("backups.done", { rows: r.rows, size: formatSize(r.bytes) }) };
}

export default async function BackupsPage() {
  const items = (await listStored(BACKUP_PREFIX)).sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  return (
    <>
      <PageHeader title={t("backups.title")}>
        <ActionForm action={backupNow} className="space-y-0">
          <Button type="submit">{t("backups.now")}</Button>
        </ActionForm>
      </PageHeader>
      <p className="mb-4 text-sm text-muted">{t("backups.help")}</p>
      {items.length === 0 ? (
        <p className="text-muted">{t("backups.empty")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("backups.file")}</Th>
              <Th>{t("backups.created")}</Th>
              <Th className="text-right">{t("backups.size")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {items.map((b) => {
              const name = b.key.slice(BACKUP_PREFIX.length);
              return (
                <tr key={b.key}>
                  <Td className="font-mono text-xs">{name}</Td>
                  <Td>{formatDateTime(b.uploadedAt)}</Td>
                  <Td className="text-right">{formatSize(b.size)}</Td>
                  <Td className="text-right">
                    <a href={`/api/admin/backups/${encodeURIComponent(name)}`} className="text-primary hover:underline">{t("content.download")}</a>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
