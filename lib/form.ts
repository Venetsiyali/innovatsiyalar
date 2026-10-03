/** State returned by server actions used with <ActionForm>. */
export type FormState = {
  error?: string;
  success?: string;
  /** Extra payload, e.g. generated credentials to show once. */
  data?: unknown;
};

export const initialFormState: FormState = {};

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string): string | null {
  return str(fd, key) || null;
}

export function int(fd: FormData, key: string, fallback = 0): number {
  const n = Number.parseInt(str(fd, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Unique-constraint violation from Prisma. */
export function isUniqueError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}
