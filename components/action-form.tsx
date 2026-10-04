"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/form";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  /** Clear inputs after a successful submit (e.g. "add" forms). */
  resetOnSuccess?: boolean;
  /** Render extra output (e.g. generated passwords) from the action's data. */
  renderData?: (data: unknown) => React.ReactNode;
  confirm?: string;
};

export function ActionForm({ action, children, className, resetOnSuccess, renderData, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.success) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={cn("space-y-3", className)}
      onSubmit={(e) => {
        // Submit manually: with `action={...}` React 19 resets every field after the action,
        // so a validation error would wipe what the user typed.
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>}
      {renderData && state.data !== undefined && renderData(state.data)}
    </form>
  );
}
