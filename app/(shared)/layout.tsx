import { AppShell } from "@/components/app-shell";
import { NAV_BY_ROLE } from "@/lib/nav";
import { requireUser } from "@/lib/permissions";

// Pages shared by all roles (notifications, announcements) — shell follows the user's role.
export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <AppShell session={session} nav={NAV_BY_ROLE[session.user.role]}>
      {children}
    </AppShell>
  );
}
