import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

/** Centered card used by the public auth pages (forgot / reset password). */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-7" />
          </div>
          <p className="font-bold">{t("app.name")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            {children}
            <Link href="/login" className="block text-center text-sm text-primary hover:underline">{t("forgot.back")}</Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
