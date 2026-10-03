import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkFile } from "@/lib/files";
import { t } from "@/lib/i18n";
import { saveLocal, storageDriver } from "@/lib/storage";
import { authorizeUpload, type UploadPayload } from "@/lib/upload-auth";

// Development fallback when no Blob token is configured: store under ./uploads.
export async function POST(request: Request) {
  if (storageDriver() !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });

  const fd = await request.formData();
  const file = fd.get("file");
  const pathname = String(fd.get("pathname") ?? "");
  if (!(file instanceof File) || !pathname) return NextResponse.json({ error: t("common.required") }, { status: 400 });
  const problem = checkFile(file.name, file.size);
  if (problem) return NextResponse.json({ error: t(problem) }, { status: 400 });
  const error = await authorizeUpload(session.user, pathname, JSON.parse(String(fd.get("payload") ?? "{}")) as UploadPayload);
  if (error) return NextResponse.json({ error }, { status: 403 });

  // Mirror Blob's random suffix so names never collide.
  const key = pathname.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${randomUUID().slice(0, 8)}${ext}`);
  return NextResponse.json({ url: await saveLocal(key, Buffer.from(await file.arrayBuffer())) });
}
