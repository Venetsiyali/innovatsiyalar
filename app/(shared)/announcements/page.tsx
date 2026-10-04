import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { Field, PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { userGroupIds, visibleAnnouncementsWhere } from "@/lib/announcements";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { sendAnnouncementAction } from "./actions";

export default async function AnnouncementsPage() {
  const session = (await auth())!;
  const user = session.user;
  const canSend = user.role === "ADMIN" || user.role === "TEACHER";
  const [items, groups] = await Promise.all([
    db.announcement.findMany({
      where: await visibleAnnouncementsWhere(user),
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { fullName: true } } },
    }),
    canSend
      ? db.group.findMany({ where: { id: { in: await userGroupIds(user) }, deletedAt: null }, orderBy: [{ shift: "asc" }, { name: "asc" }] })
      : [],
  ]);
  const groupName = new Map((await db.group.findMany({ where: { id: { in: items.flatMap((a) => a.groupIds) } } })).map((g) => [g.id, g.name]));

  return (
    <>
      <PageHeader title={t("announcements.title")} />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          {items.length === 0 && <p className="text-muted">{t("announcements.empty")}</p>}
          {items.map((a) => (
            <Card key={a.id} id={a.id} className="scroll-mt-20 space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{a.title}</CardTitle>
                <Badge tone="gray">
                  {a.scope === "ALL"
                    ? t("announcements.toAll")
                    : t("announcements.toGroups", { groups: a.groupIds.map((g) => groupName.get(g) ?? "").join(", ") })}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm">{a.body}</p>
              <p className="text-xs text-muted">{t("announcements.by", { author: a.author.fullName, date: formatDateTime(a.createdAt) })}</p>
            </Card>
          ))}
        </div>

        {canSend && (
          <Card className="h-fit p-5">
            <ActionForm action={sendAnnouncementAction} resetOnSuccess>
              <CardTitle className="text-base">{t("announcements.new")}</CardTitle>
              <Field label={t("announcements.titleField")} htmlFor="title">
                <Input id="title" name="title" required />
              </Field>
              <Field label={t("announcements.body")} htmlFor="body">
                <textarea
                  id="body"
                  name="body"
                  rows={5}
                  required
                  className="w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </Field>
              {user.role === "ADMIN" ? (
                <Field label={t("announcements.scope")} htmlFor="scope">
                  <Select id="scope" name="scope" defaultValue="ALL">
                    <option value="ALL">{t("announcements.ALL")}</option>
                    <option value="GROUPS">{t("announcements.GROUPS")}</option>
                  </Select>
                </Field>
              ) : (
                <p className="text-xs text-muted">{t("announcements.myGroups")}</p>
              )}
              <fieldset className="space-y-1">
                <legend className="text-sm font-medium">{t("announcements.groups")}</legend>
                <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="groupIds" value={g.id} className="size-4" />
                      {g.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button type="submit" className="w-full">{t("announcements.send")}</Button>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
