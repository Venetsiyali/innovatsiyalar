import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { t } from "@/lib/i18n";

export default function LoginPage() {
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
          <CardContent>
            <LoginForm
              labels={{
                email: t("auth.email"),
                password: t("auth.password"),
                submit: t("auth.submit"),
                submitting: t("auth.submitting"),
              }}
            />
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted">{t("auth.noSignup")}</p>
      </div>
    </main>
  );
}
