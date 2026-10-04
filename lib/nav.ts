import type { Role } from "@prisma/client";
import type { IconName } from "@/components/nav-link";

export type NavItem = { href: string; labelKey: string; icon: IconName; exact?: boolean };

const ANNOUNCEMENTS: NavItem = { href: "/announcements", labelKey: "nav.announcements", icon: "announcements" };

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
    { href: "/admin/users", labelKey: "nav.users", icon: "users" },
    { href: "/admin/structure", labelKey: "nav.structure", icon: "structure" },
    { href: "/admin/groups", labelKey: "nav.groups", icon: "groups" },
    { href: "/admin/courses", labelKey: "nav.courses", icon: "courses" },
    { href: "/admin/schedule", labelKey: "nav.schedule", icon: "schedule" },
    { href: "/admin/reports", labelKey: "nav.reports", icon: "reports" },
    { href: "/admin/backups", labelKey: "nav.backups", icon: "backups" },
    ANNOUNCEMENTS,
  ],
  TEACHER: [
    { href: "/teacher", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
    { href: "/teacher/my-courses", labelKey: "nav.myCourses", icon: "courses" },
    { href: "/teacher/schedule", labelKey: "nav.schedule", icon: "schedule" },
    { href: "/teacher/assignments", labelKey: "nav.assignments", icon: "assignments" },
    { href: "/teacher/attendance", labelKey: "nav.attendance", icon: "attendance" },
    { href: "/teacher/gradebook", labelKey: "nav.gradebook", icon: "gradebook" },
    ANNOUNCEMENTS,
  ],
  STUDENT: [
    { href: "/student", labelKey: "nav.dashboard", icon: "dashboard", exact: true },
    { href: "/student/courses", labelKey: "nav.courses", icon: "courses" },
    { href: "/student/schedule", labelKey: "nav.schedule", icon: "schedule" },
    { href: "/student/assignments", labelKey: "nav.assignments", icon: "assignments" },
    { href: "/student/grades", labelKey: "nav.grades", icon: "grades" },
    ANNOUNCEMENTS,
  ],
};
