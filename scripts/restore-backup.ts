// Restore a backup into an EMPTY database (e.g. a fresh Neon branch):
//   DATABASE_URL=... npx tsx scripts/restore-backup.ts iusi-lms-2026-10-04.json.gz
// Apply migrations first (npx prisma migrate deploy). Existing rows with the same id are skipped.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { PrismaClient } from "@prisma/client";
import { BACKUP_MODELS } from "../lib/backup-models";

const file = process.argv[2];
if (!file) {
  console.error("Fayl ko'rsating: npx tsx scripts/restore-backup.ts <backup.json.gz>");
  process.exit(1);
}

const db = new PrismaClient();
type Delegate = { createMany: (args: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }> };

async function main() {
  const { tables } = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as { tables: Record<string, unknown[]> };
  for (const model of BACKUP_MODELS) {
    const rows = tables[model] ?? [];
    for (let i = 0; i < rows.length; i += 1000) {
      const { count } = await (db[model] as unknown as Delegate).createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
      if (i === 0) console.log(`${model}: ${rows.length} (${count}+)`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
