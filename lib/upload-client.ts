"use client";

import { upload } from "@vercel/blob/client";
import { MB, sanitizeFileName } from "@/lib/files";

type Options = {
  driver: "blob" | "local";
  /** Folder (ends with "/") — the sanitised file name is appended. */
  prefix: string;
  payload: { courseId: string; assignmentId?: string; kind: "material" | "attachment" | "submission" };
  onProgress?: (pct: number) => void;
};

/** Upload a file to storage straight from the browser; returns the stored file URL. */
export async function uploadFile(file: File, { driver, prefix, payload, onProgress }: Options): Promise<string> {
  const pathname = prefix + sanitizeFileName(file.name);
  if (driver === "blob") {
    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify(payload),
      multipart: file.size > 20 * MB,
      onUploadProgress: onProgress ? ({ percentage }) => onProgress(Math.round(percentage)) : undefined,
    });
    return blob.url;
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("pathname", pathname);
  fd.append("payload", JSON.stringify(payload));
  const res = await fetch("/api/upload/local", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
  return json.url;
}
