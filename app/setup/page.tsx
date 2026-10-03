import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { setupAction } from "./actions";

export const dynamic = "force-dynamic";
// Importing the two timetables takes a while on a cold serverless database.
export const maxDuration = 300;

export default async function SetupPage() {
  const done = (await db.user.count({ where: { role: "ADMIN" } })) > 0;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("setup.title")}</CardTitle>
          {!done && <p className="text-sm text-muted">{t("setup.subtitle")}</p>}
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm">
              {t("setup.alreadyDone")}{" "}
              <Link href="/login" className="text-primary hover:underline">{t("auth.submit")}</Link>
            </p>
          ) : (
            <ActionForm action={setupAction}>
              <Field label={t("setup.key")} htmlFor="setupKey">
                <Input id="setupKey" name="setupKey" type="password" required autoComplete="off" />
              </Field>
              <p className="text-xs text-muted">{t("setup.keyHint")}</p>
              <Field label={t("users.fullName")} htmlFor="fullName">
                <Input id="fullName" name="fullName" required defaultValue="Administrator" />
              </Field>
              <Field label={t("users.email")} htmlFor="email">
                <Input id="email" name="email" type="email" required defaultValue="admin@iusi.uz" />
              </Field>
              <Field label={t("password.new")} htmlFor="password">
                <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
              </Field>
              <Field label={t("password.confirm")} htmlFor="confirm">
                <Input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
              </Field>
              <p className="text-xs text-muted">{t("setup.wait")}</p>
              <Button type="submit" className="w-full">{t("setup.submit")}</Button>
            </ActionForm>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
