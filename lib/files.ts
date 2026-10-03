// Client-safe file rules (TZ 4.4 / 7): whitelist of extensions, size limits, name sanitising.

export const MB = 1024 * 1024;
export const MAX_FILE_SIZE = 200 * MB;
export const MAX_VIDEO_SIZE = 500 * MB;

export const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
};

export const ACCEPT = Object.keys(MIME_BY_EXT).map((e) => `.${e}`).join(",");

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

export function maxSizeFor(name: string): number {
  return extOf(name) === "mp4" ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
}

/** Returns an i18n key for the problem, or null if the file is acceptable. */
export function checkFile(name: string, size: number): "content.badType" | "content.tooBig" | null {
  if (!MIME_BY_EXT[extOf(name)]) return "content.badType";
  if (size > maxSizeFor(name)) return "content.tooBig";
  return null;
}

/** Keep letters/digits (any script), dot, dash, underscore; collapse the rest. */
export function sanitizeFileName(name: string): string {
  const ext = extOf(name);
  const base = name.slice(0, ext ? -(ext.length + 1) : undefined);
  const clean = base.normalize("NFC").replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/^[._]+|_+$/g, "").slice(0, 80) || "file";
  return ext ? `${clean}.${ext}` : clean;
}

export function isPreviewable(mime: string | null | undefined): boolean {
  return !!mime && (mime === "application/pdf" || mime.startsWith("image/") || mime === "video/mp4");
}

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** YouTube watch/share/shorts URL → video id. */
export function youtubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}
