import Link from "next/link";
import { Bell, GraduationCap, LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { signOut } from "@/auth";
import { NavLink } from "@/components/nav-link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import type { NavItem } from "@/lib/nav";

export type { NavItem };

export async function AppShell({ session, nav, children }: { session: Session; nav: NavItem[]; children: React.ReactNode }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  const unread = await db.notification.count({ where: { userId: session.user.id, isRead: false, deletedAt: null } });

  return (
    <div className="min-h-dvh md:flex">
      <aside className="print:hidden border-b border-border bg-card md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">{t("app.name")}</p>
            <p className="text-xs text-muted">{t(`roles.${session.user.role}`)}</p>
          </div>
        </div>
        {/* Horizontal scroll on phones, vertical list on desktop */}
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} label={t(item.labelKey)} icon={item.icon} exact={item.exact} />
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="print:hidden flex items-center justify-end gap-3 border-b border-border bg-card px-4 py-3">
          <Link
            href="/notifications"
            className="relative rounded-md p-2 hover:bg-accent"
            aria-label={unread ? t("notifications.unread", { count: unread }) : t("notifications.bell")}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <span className="truncate text-sm text-muted">{session.user.name}</span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              <LogOut className="size-4" />
              {t("auth.logout")}
            </Button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function ComingSoon({ titleKey }: { titleKey: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="text-muted">{t("dashboard.comingSoon")}</p>
    </div>
  );
}
