import "server-only";
import { NextResponse } from "next/server";
import { extOf, isPreviewable, MIME_BY_EXT, sanitizeFileName } from "@/lib/files";
import { t } from "@/lib/i18n";
import { keyOf, openStored } from "@/lib/storage";

/** Stream a stored file. Callers must have checked access already. */
export async function serveStored(fileUrl: string, title: string, download: boolean) {
  const file = await openStored(fileUrl);
  if (!file) return NextResponse.json({ error: t("content.fileMissing") }, { status: 404 });
  const ext = extOf(keyOf(fileUrl));
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const name = sanitizeFileName(`${title}${ext && !title.toLowerCase().endsWith(`.${ext}`) ? `.${ext}` : ""}`);
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(file.size),
      "Content-Disposition": `${isPreviewable(mime) && !download ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
