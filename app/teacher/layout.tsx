import { AppShell } from "@/components/app-shell";
import { NAV_BY_ROLE } from "@/lib/nav";
import { requireRole } from "@/lib/permissions";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Server-side role check — middleware alone is not enough.
  const session = await requireRole("TEACHER");
  return (
    <AppShell session={session} nav={NAV_BY_ROLE.TEACHER}>
      {children}
    </AppShell>
  );
}
