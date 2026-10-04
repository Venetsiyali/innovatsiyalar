import "server-only";
import { gzipSync } from "node:zlib";
import { db } from "@/lib/db";
import { deleteStored, listStored, putStored } from "@/lib/storage";

export const BACKUP_PREFIX = "backups/";
const KEEP_DAYS = 30; // TZ 7: keep the last 30 days

export { BACKUP_MODELS } from "@/lib/backup-models";
import { BACKUP_MODELS } from "@/lib/backup-models";

type Delegate = { findMany: (args?: object) => Promise<unknown[]> };

/** Dump every table (soft-deleted rows included) to a gzipped JSON file in private storage. */
export async function createBackup(now = new Date()) {
  const tables: Record<string, unknown[]> = {};
  for (const model of BACKUP_MODELS) {
    tables[model] = await (db[model] as unknown as Delegate).findMany();
  }
  const payload = gzipSync(Buffer.from(JSON.stringify({ version: 1, createdAt: now.toISOString(), tables })));
  // Stamp in Tashkent time; one file per day (a manual run the same day overwrites it).
  const day = new Date(now.getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
  const key = `${BACKUP_PREFIX}iusi-lms-${day}.json.gz`;
  await putStored(key, payload, "application/gzip");

  const cutoff = now.getTime() - KEEP_DAYS * 86_400_000;
  const old = (await listStored(BACKUP_PREFIX)).filter((b) => b.uploadedAt.getTime() < cutoff);
  for (const b of old) await deleteStored(b.url);

  return { key, bytes: payload.length, rows: Object.values(tables).reduce((n, t) => n + t.length, 0), deleted: old.length };
}
