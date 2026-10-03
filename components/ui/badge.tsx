import * as React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-accent text-primary",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-slate-100 text-slate-600",
};

export function Badge({ tone = "default", className, ...props }: React.ComponentProps<"span"> & { tone?: keyof typeof TONES }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)} {...props} />;
}
