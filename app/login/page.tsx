import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { t } from "@/lib/i18n";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  const { changed } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">{t("app.name")}</h1>
          <p className="text-sm text-muted">{t("app.fullName")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.title")}</CardTitle>
            <p className="text-sm text-muted">{t("auth.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {changed && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{t("password.changed")}</p>
            )}
            <LoginForm
              labels={{
                email: t("auth.email"),
                password: t("auth.password"),
                submit: t("auth.submit"),
                submitting: t("auth.submitting"),
              }}
            />
            <Link href="/forgot-password" className="block text-center text-sm text-primary hover:underline">
              {t("auth.forgot")}
            </Link>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted">{t("auth.noSignup")}</p>
      </div>
    </main>
  );
}
