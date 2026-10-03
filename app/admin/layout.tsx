import { AppShell, type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/permissions";

const NAV: NavItem[] = [
  { href: "/admin", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
  { href: "/admin/users", labelKey: "nav.users", icon: "users" },
  { href: "/admin/structure", labelKey: "nav.structure", icon: "structure" },
  { href: "/admin/groups", labelKey: "nav.groups", icon: "groups" },
  { href: "/admin/courses", labelKey: "nav.courses", icon: "courses" },
  { href: "/admin/schedule", labelKey: "nav.schedule", icon: "schedule" },
  { href: "/admin/reports", labelKey: "nav.reports", icon: "reports" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Server-side role check — middleware alone is not enough.
  const session = await requireRole("ADMIN");
  return (
    <AppShell session={session} nav={NAV}>
      {children}
    </AppShell>
  );
}
