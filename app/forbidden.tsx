import Link from "next/link";
import { t } from "@/lib/i18n";

export default function Forbidden() {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">{t("errors.forbiddenTitle")}</h1>
      <p className="text-muted">{t("errors.forbidden")}</p>
      <Link href="/" className="text-primary hover:underline">{t("nav.dashboard")}</Link>
    </main>
  );
}
