"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  DatabaseBackup,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  Star,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  backups: DatabaseBackup,
  announcements: Megaphone,
  structure: Building2,
  groups: UsersRound,
  courses: BookOpen,
  schedule: CalendarDays,
  attendance: CalendarCheck,
  reports: BarChart3,
  assignments: ClipboardList,
  gradebook: NotebookPen,
  grades: Star,
};

export type IconName = keyof typeof ICONS;

export function NavLink({ href, label, icon, exact }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

/** Bottom tab bar item for phones. */
export function TabLink({ href, label, icon, exact }: { href: string; label: string; icon: IconName; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = ICONS[icon];
  return (
    <Link
      href={href}
      className={cn("flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] leading-tight", active ? "text-primary" : "text-muted")}
    >
      <Icon className="size-5" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
