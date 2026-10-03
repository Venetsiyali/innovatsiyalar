"use client";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form";
import type { ImportReport } from "../actions";

type Props = { action: (p: FormState, fd: FormData) => Promise<FormState>; labels: { submit: string; conflicts: string } };

export function ScheduleImportForm({ action, labels }: Props) {
  return (
    <ActionForm
      action={action}
      renderData={(data) =>
        (data as ImportReport[])
          .filter((r) => r.conflicts.length)
          .map((r) => (
            <div key={r.file} className="space-y-1">
              <p className="text-sm font-medium">
                {labels.conflicts} — {r.file}
              </p>
              <ul className="list-disc rounded-md bg-amber-50 py-2 pr-3 pl-8 text-sm text-amber-800">
                {r.conflicts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ))
      }
    >
      <Input name="files" type="file" accept=".xlsx" multiple required />
      <Button type="submit">{labels.submit}</Button>
    </ActionForm>
  );
}
