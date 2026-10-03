import { AppShell, type NavItem } from "@/components/app-shell";
import { requireRole } from "@/lib/permissions";

const NAV: NavItem[] = [
  { href: "/teacher", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
  { href: "/teacher/my-courses", labelKey: "nav.myCourses", icon: "courses" },
  { href: "/teacher/schedule", labelKey: "nav.schedule", icon: "schedule" },
  { href: "/teacher/assignments", labelKey: "nav.assignments", icon: "assignments" },
  { href: "/teacher/attendance", labelKey: "nav.attendance", icon: "attendance" },
  { href: "/teacher/gradebook", labelKey: "nav.gradebook", icon: "gradebook" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Server-side role check — middleware alone is not enough.
  const session = await requireRole("TEACHER");
  return (
    <AppShell session={session} nav={NAV}>
      {children}
    </AppShell>
  );
}
