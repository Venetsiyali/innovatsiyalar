import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, head, list, put } from "@vercel/blob";

// Production: private Vercel Blob store. Local dev without a token: ./uploads on disk.
export type StorageDriver = "blob" | "local";

export function storageDriver(): StorageDriver {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
}

const LOCAL_ROOT = path.join(process.cwd(), "uploads");
const LOCAL_PREFIX = "local:";

/** Every course file lives under this prefix; used to verify uploads belong to the course. */
export function coursePrefix(courseId: string): string {
  return `courses/${courseId}/`;
}

function localPath(key: string): string {
  const full = path.resolve(LOCAL_ROOT, key);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid path");
  return full;
}

export async function saveLocal(key: string, data: Buffer): Promise<string> {
  const full = localPath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return LOCAL_PREFIX + key;
}

/** The storage key (pathname) behind a stored file URL. */
export function keyOf(fileUrl: string): string {
  if (fileUrl.startsWith(LOCAL_PREFIX)) return fileUrl.slice(LOCAL_PREFIX.length);
  return new URL(fileUrl).pathname.replace(/^\//, "");
}

/** Size of a stored file, or null if it doesn't exist. */
export async function storedSize(fileUrl: string): Promise<number | null> {
  try {
    if (fileUrl.startsWith(LOCAL_PREFIX)) return (await stat(localPath(keyOf(fileUrl)))).size;
    return (await head(fileUrl)).size;
  } catch {
    return null;
  }
}

export async function openStored(fileUrl: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number } | null> {
  if (fileUrl.startsWith(LOCAL_PREFIX)) {
    const full = localPath(keyOf(fileUrl));
    const size = (await stat(full).catch(() => null))?.size;
    if (size == null) return null;
    return { stream: Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>, size };
  }
  const res = await get(fileUrl, { access: "private" });
  if (!res || res.statusCode !== 200) return null;
  return { stream: res.stream, size: res.blob.size };
}

export type StoredItem = { key: string; url: string; size: number; uploadedAt: Date };

/** Server-side write (used for backups; user files are uploaded from the browser). */
export async function putStored(key: string, data: Buffer, contentType: string): Promise<string> {
  if (storageDriver() === "local") return saveLocal(key, data);
  const blob = await put(key, data, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
  return blob.url;
}

export async function listStored(prefix: string): Promise<StoredItem[]> {
  if (storageDriver() === "local") {
    const dir = localPath(prefix.replace(/\/$/, "") + "/x").replace(/[/\\]x$/, "");
    const names = await readdir(dir).catch(() => [] as string[]);
    return Promise.all(
      names.map(async (n) => {
        const st = await stat(path.join(dir, n));
        return { key: prefix + n, url: LOCAL_PREFIX + prefix + n, size: st.size, uploadedAt: st.mtime };
      }),
    );
  }
  const out: StoredItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor });
    out.push(...page.blobs.map((b) => ({ key: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export async function deleteStored(fileUrl: string): Promise<void> {
  if (fileUrl.startsWith(LOCAL_PREFIX)) await rm(localPath(keyOf(fileUrl)), { force: true });
  else await del(fileUrl);
}
