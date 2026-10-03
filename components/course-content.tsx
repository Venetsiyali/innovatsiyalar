import type { Material, Module } from "@prisma/client";
import Link from "next/link";
import { ArrowDown, ArrowUp, ClipboardList, ExternalLink, FileText, Link2, PlayCircle } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import { FileUploader } from "@/components/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addSimpleMaterialAction,
  deleteMaterialAction,
  deleteModuleAction,
  moveModuleAction,
  saveModuleAction,
} from "@/lib/content-actions";
import { studentAssignmentsWhere } from "@/lib/assignments";
import { isModuleOpen } from "@/lib/course-access";
import { formatDate, formatDateTime, toLocalInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatSize, youtubeId } from "@/lib/files";
import { t } from "@/lib/i18n";
import { storageDriver } from "@/lib/storage";

const fileHref = (id: string, download = false) => `/api/files/${id}${download ? "?download=1" : ""}`;

function uploaderLabels() {
  return {
    drop: t("content.dropHere"),
    allowed: t("content.allowed"),
    uploading: t("content.uploading"),
    uploaded: t("content.uploaded"),
    failed: t("content.uploadFailed"),
    badType: t("content.badType"),
    tooBig: t("content.tooBig"),
  };
}

function MaterialItem({
  m,
  older,
  canManage,
  courseId,
}: {
  m: Material;
  older: Material[];
  canManage: boolean;
  courseId: string;
}) {
  const yt = m.type === "VIDEO" && m.url ? youtubeId(m.url) : null;
  return (
    <li className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {m.type === "FILE" ? (
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
          ) : m.type === "VIDEO" ? (
            <PlayCircle className="mt-0.5 size-4 shrink-0 text-primary" />
          ) : (
            <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0">
            <p className="break-words font-medium">{m.title}</p>
            {m.type === "FILE" && (
              <p className="text-xs text-muted">
                {formatSize(m.sizeBytes)}
                {m.version > 1 && ` · ${t("content.version", { n: m.version })}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {m.type === "FILE" && m.mimeType && /pdf|image|video/.test(m.mimeType) && (
            <a href={fileHref(m.id)} target="_blank" rel="noopener">
              <Button size="sm" variant="outline">{t("content.view")}</Button>
            </a>
          )}
          {m.type === "FILE" && (
            <a href={fileHref(m.id, true)}>
              <Button size="sm" variant="outline">{t("content.download")}</Button>
            </a>
          )}
          {m.type === "LINK" && m.url && (
            <a href={m.url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <ExternalLink className="size-3.5" />
                {t("content.view")}
              </Button>
            </a>
          )}
          {canManage && (
            <ActionForm action={deleteMaterialAction.bind(null, m.id)} confirm={t("common.confirmDelete")} className="space-y-0">
              <Button size="sm" variant="ghost" className="text-destructive">{t("common.delete")}</Button>
            </ActionForm>
          )}
        </div>
      </div>

      {m.type === "FILE" && m.mimeType?.startsWith("image/") && (
        // eslint-disable-next-line @next/next/no-img-element -- private file served through an auth-checked route
        <img src={fileHref(m.id)} alt={m.title} loading="lazy" className="max-h-64 rounded-md border border-border" />
      )}
      {yt && (
        <div className="aspect-video overflow-hidden rounded-md">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}`}
            title={m.title}
            className="size-full"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
      {m.type === "PAGE" && <div className="whitespace-pre-wrap text-sm">{m.body}</div>}

      {older.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted">{t("content.oldVersions")} ({older.length})</summary>
          <ul className="mt-1 space-y-1 pl-4">
            {older.map((o) => (
              <li key={o.id}>
                <a className="text-primary hover:underline" href={fileHref(o.id, true)}>
                  {t("content.version", { n: o.version })}
                </a>{" "}
                <span className="text-muted">{formatDate(o.createdAt)} · {formatSize(o.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {canManage && m.type === "FILE" && (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary">{t("content.newVersion")}</summary>
          <div className="mt-2">
            <FileUploader courseId={courseId} moduleId={m.moduleId} driver={storageDriver()} labels={uploaderLabels()} previousId={m.id} single />
          </div>
        </details>
      )}
    </li>
  );
}

function ModuleFields({ mod }: { mod?: Module }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
      <Field label={t("content.moduleTitle")}>
        <Input name="title" required defaultValue={mod?.title} />
      </Field>
      <Field label={t("content.opensAt")}>
        <Input name="opensAt" type="datetime-local" defaultValue={toLocalInput(mod?.opensAt ?? null)} />
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="isHidden" defaultChecked={mod?.isHidden} className="size-4" />
        {t("content.hidden")}
      </label>
    </div>
  );
}

function SimpleMaterialForm({ moduleId, type }: { moduleId: string; type: "LINK" | "VIDEO" | "PAGE" }) {
  const label = { LINK: "content.addLink", VIDEO: "content.addVideo", PAGE: "content.addPage" }[type];
  return (
    <details className="rounded-md border border-border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">+ {t(label)}</summary>
      <ActionForm action={addSimpleMaterialAction.bind(null, moduleId, type)} resetOnSuccess className="mt-2">
        <Input name="title" required placeholder={t("content.title")} aria-label={t("content.title")} />
        {type === "PAGE" ? (
          <textarea
            name="body"
            required
            rows={6}
            placeholder={t("content.body")}
            className="w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        ) : (
          <Input name="url" type="url" required placeholder={type === "VIDEO" ? "https://youtu.be/…" : "https://…"} aria-label={t("content.url")} />
        )}
        <Button type="submit" size="sm">{t("common.add")}</Button>
      </ActionForm>
    </details>
  );
}

/** Course → Module → Element. Managers (admin / course teacher) get editing tools; students read only. */
export async function CourseContent({
  courseId,
  canManage,
  assignmentHref,
  studentId,
}: {
  courseId: string;
  canManage: boolean;
  /** Base path for assignment links, e.g. "/teacher/assignments" (none for admin). */
  assignmentHref?: string;
  /** When viewing as a student: only their assignments are listed. */
  studentId?: string;
}) {
  const live = { deletedAt: null };
  const [modules, materials, assignments] = await Promise.all([
    db.module.findMany({ where: { courseId, ...live }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    db.material.findMany({ where: { module: { courseId }, ...live }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    db.assignment.findMany({
      where: { courseId, moduleId: { not: null }, ...(studentId ? studentAssignmentsWhere(studentId) : live) },
      orderBy: { deadline: "asc" },
    }),
  ]);

  // Version chains: the latest version is the one nobody points to as "previous".
  const byId = new Map(materials.map((m) => [m.id, m]));
  const superseded = new Set(materials.map((m) => m.previousId).filter(Boolean));
  const olderOf = (m: Material) => {
    const out: Material[] = [];
    for (let p = m.previousId ? byId.get(m.previousId) : undefined; p; p = p.previousId ? byId.get(p.previousId) : undefined) out.push(p);
    return out;
  };
  const visible = canManage ? modules : modules.filter((m) => isModuleOpen(m));

  return (
    <div className="space-y-4">
      {visible.length === 0 && <p className="text-muted">{t("content.noModules")}</p>}
      {visible.map((mod, i) => {
        const items = materials.filter((m) => m.moduleId === mod.id && !superseded.has(m.id));
        return (
          <Card key={mod.id} className="space-y-3 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{mod.title}</h2>
              <div className="flex flex-wrap items-center gap-1">
                {mod.isHidden && <Badge tone="red">{t("content.hiddenBadge")}</Badge>}
                {mod.opensAt && mod.opensAt > new Date() && (
                  <Badge tone="gray">{t("content.opensBadge", { date: formatDateTime(mod.opensAt) })}</Badge>
                )}
                {canManage && (
                  <>
                    <ActionForm action={moveModuleAction.bind(null, mod.id, -1)} className="space-y-0">
                      <Button size="sm" variant="ghost" disabled={i === 0} aria-label={t("content.moveUp")}>
                        <ArrowUp className="size-4" />
                      </Button>
                    </ActionForm>
                    <ActionForm action={moveModuleAction.bind(null, mod.id, 1)} className="space-y-0">
                      <Button size="sm" variant="ghost" disabled={i === visible.length - 1} aria-label={t("content.moveDown")}>
                        <ArrowDown className="size-4" />
                      </Button>
                    </ActionForm>
                  </>
                )}
              </div>
            </div>

            {assignments.some((x) => x.moduleId === mod.id) && (
              <ul className="space-y-1">
                {assignments
                  .filter((x) => x.moduleId === mod.id)
                  .map((x) => (
                    <li key={x.id} className="flex items-center gap-2 rounded-lg border border-primary/30 bg-accent/40 p-3 text-sm">
                      <ClipboardList className="size-4 shrink-0 text-primary" />
                      {assignmentHref ? (
                        <Link href={`${assignmentHref}/${x.id}`} className="flex-1 font-medium text-primary hover:underline">
                          {x.title}
                        </Link>
                      ) : (
                        <span className="flex-1 font-medium">{x.title}</span>
                      )}
                      <span className="text-xs text-muted">{t("assignments.due", { date: formatDateTime(x.deadline) })}</span>
                    </li>
                  ))}
              </ul>
            )}

            {items.length === 0 && !assignments.some((x) => x.moduleId === mod.id) ? (
              <p className="text-sm text-muted">{t("content.noMaterials")}</p>
            ) : (
              <ul className="space-y-2">
                {items.map((m) => (
                  <MaterialItem key={m.id} m={m} older={olderOf(m)} canManage={canManage} courseId={courseId} />
                ))}
              </ul>
            )}

            {canManage && (
              <div className="space-y-2 border-t border-border pt-3">
                <FileUploader courseId={courseId} moduleId={mod.id} driver={storageDriver()} labels={uploaderLabels()} />
                <div className="grid gap-2 md:grid-cols-3">
                  <SimpleMaterialForm moduleId={mod.id} type="LINK" />
                  <SimpleMaterialForm moduleId={mod.id} type="VIDEO" />
                  <SimpleMaterialForm moduleId={mod.id} type="PAGE" />
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">{t("common.edit")}</summary>
                  <div className="mt-2 space-y-2">
                    <ActionForm action={saveModuleAction.bind(null, courseId, mod.id)}>
                      <ModuleFields mod={mod} />
                      <Button type="submit" size="sm" variant="outline">{t("common.save")}</Button>
                    </ActionForm>
                    <ActionForm action={deleteModuleAction.bind(null, mod.id)} confirm={t("common.confirmDelete")}>
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">{t("content.deleteModule")}</Button>
                    </ActionForm>
                  </div>
                </details>
              </div>
            )}
          </Card>
        );
      })}

      {canManage && (
        <Card className="p-4 md:p-5">
          <ActionForm action={saveModuleAction.bind(null, courseId, null)} resetOnSuccess>
            <p className="font-semibold">{t("content.newModule")}</p>
            <ModuleFields />
            <Button type="submit">{t("common.add")}</Button>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
