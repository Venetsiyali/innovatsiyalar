"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addFileMaterialAction } from "@/lib/content-actions";
import { ACCEPT, checkFile } from "@/lib/files";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Labels = { drop: string; allowed: string; uploading: string; uploaded: string; failed: string; badType: string; tooBig: string };

type Item = { name: string; status: "uploading" | "done" | "error"; message?: string; progress?: number };

export function FileUploader({
  courseId,
  moduleId,
  driver,
  labels,
  previousId,
  single,
}: {
  courseId: string;
  moduleId: string;
  driver: "blob" | "local";
  labels: Labels;
  /** Upload as a new version of this material. */
  previousId?: string;
  single?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);

  const update = (name: string, patch: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.name === name ? { ...it, ...patch } : it)));

  async function send(file: File) {
    const problem = checkFile(file.name, file.size);
    if (problem) {
      update(file.name, { status: "error", message: problem === "content.badType" ? labels.badType : labels.tooBig });
      return;
    }
    try {
      const url = await uploadFile(file, {
        driver,
        prefix: `courses/${courseId}/`,
        payload: { courseId, kind: "material" },
        onProgress: (progress) => update(file.name, { progress }),
      });
      const saved = await addFileMaterialAction(moduleId, { url, name: file.name, previousId });
      if (saved.error) throw new Error(saved.error);
      update(file.name, { status: "done" });
    } catch (e) {
      update(file.name, { status: "error", message: e instanceof Error ? e.message : labels.failed });
    }
  }

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const list = single ? [files[0]] : [...files];
    setItems((prev) => [...prev, ...list.map((f) => ({ name: f.name, status: "uploading" as const }))]);
    // Upload sequentially to keep memory and bandwidth predictable on phones.
    for (const f of list) await send(f);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed border-border p-4 text-center text-sm transition-colors",
          over ? "border-primary bg-accent" : "hover:bg-accent/50",
        )}
      >
        <Upload className="size-5 text-primary" />
        <span>{labels.drop}</span>
        <span className="text-xs text-muted">{labels.allowed}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={!single}
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files);
          e.target.value = "";
        }}
      />
      {items.length > 0 && (
        <ul className="space-y-1 text-xs">
          {items.map((it) => (
            <li key={it.name} className="flex justify-between gap-2">
              <span className="truncate">{it.name}</span>
              <span className={cn(it.status === "error" ? "text-destructive" : it.status === "done" ? "text-emerald-600" : "text-muted")}>
                {it.status === "uploading"
                  ? `${labels.uploading}${it.progress != null ? ` ${it.progress}%` : ""}`
                  : it.status === "done"
                    ? labels.uploaded
                    : it.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
