"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  NotebookPen,
  Star,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  users: Users,
  groups: UsersRound,
  courses: BookOpen,
  schedule: CalendarDays,
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
