"use client";

import { Paperclip, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPT, checkFile } from "@/lib/files";
import { uploadFile } from "@/lib/upload-client";

type Props = {
  name: string;
  driver: "blob" | "local";
  prefix: string;
  payload: Parameters<typeof uploadFile>[1]["payload"];
  initialUrl?: string | null;
  initialLabel?: string;
  labels: { choose: string; uploading: string; remove: string; badType: string; tooBig: string };
};

/** Uploads a single file straight to storage and keeps its URL in a hidden input for the surrounding form. */
export function UploadField({ name, driver, prefix, payload, initialUrl, initialLabel, labels }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [label, setLabel] = useState(initialLabel ?? "");
  const [status, setStatus] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file.name, file.size);
    if (problem) return setStatus(problem === "content.badType" ? labels.badType : labels.tooBig);
    setStatus(labels.uploading);
    try {
      setUrl(await uploadFile(file, { driver, prefix, payload, onProgress: (p) => setStatus(`${labels.uploading} ${p}%`) }));
      setLabel(file.name);
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-1">
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <Paperclip className="size-4 text-primary" />
          <span className="flex-1 truncate">{label}</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => setUrl("")} aria-label={labels.remove}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm hover:bg-accent/50">
          <Paperclip className="size-4 text-primary" />
          {labels.choose}
          <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      )}
      {status && <p className="text-xs text-muted">{status}</p>}
    </div>
  );
}
