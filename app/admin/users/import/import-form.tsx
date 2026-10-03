"use client";

import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form";
import type { ImportedUser } from "@/lib/user-import";

type Labels = { file: string; submit: string; credentials: string; downloadCsv: string; roles: Record<string, string> };

function downloadCsv(users: ImportedUser[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [["F.I.Sh", "Email", "Rol", "Guruh", "Parol"], ...users.map((u) => [u.fullName, u.email, u.role, u.group ?? "", u.password])];
  // BOM so Excel opens UTF-8 (o', g') correctly.
  const blob = new Blob(["﻿" + lines.map((l) => l.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "parollar.csv" });
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ImportForm({ action, labels }: { action: (p: FormState, fd: FormData) => Promise<FormState>; labels: Labels }) {
  return (
    <ActionForm
      action={action}
      renderData={(data) => {
        const { created, errors } = data as { created: ImportedUser[]; errors: string[] };
        return (
          <div className="space-y-3">
            {errors.length > 0 && (
              <ul className="max-h-48 list-disc overflow-y-auto rounded-md bg-amber-50 py-2 pr-3 pl-8 text-sm text-amber-800">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {created.length > 0 && (
              <>
                <p className="text-sm font-medium">{labels.credentials}</p>
                <Button type="button" variant="outline" onClick={() => downloadCsv(created)}>
                  {labels.downloadCsv}
                </Button>
                <div className="max-h-96 overflow-y-auto rounded-md border border-border text-sm">
                  <table className="w-full">
                    <tbody>
                      {created.map((u) => (
                        <tr key={u.email} className="border-b border-border">
                          <td className="px-3 py-1.5">{u.fullName}</td>
                          <td className="px-3 py-1.5 text-muted">{u.email}</td>
                          <td className="px-3 py-1.5">{labels.roles[u.role]}</td>
                          <td className="px-3 py-1.5 font-mono">{u.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      }}
    >
      <Input name="file" type="file" accept=".xlsx,.csv" required aria-label={labels.file} />
      <Button type="submit">{labels.submit}</Button>
    </ActionForm>
  );
}
