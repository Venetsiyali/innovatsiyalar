import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("border-b border-border bg-accent/50 px-3 py-2 text-left font-medium", className)} {...props} />;
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b border-border px-3 py-2 align-middle", className)} {...props} />;
}
