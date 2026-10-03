import { AppShell, type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/permissions";

const NAV: NavItem[] = [
  { href: "/student", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
  { href: "/student/courses", labelKey: "nav.courses", icon: "courses" },
  { href: "/student/schedule", labelKey: "nav.schedule", icon: "schedule" },
  { href: "/student/assignments", labelKey: "nav.assignments", icon: "assignments" },
  { href: "/student/grades", labelKey: "nav.grades", icon: "grades" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Server-side role check — middleware alone is not enough.
  const session = await requireRole("STUDENT");
  return (
    <AppShell session={session} nav={NAV}>
      {children}
    </AppShell>
  );
}
