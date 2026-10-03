// Dates are handled as UTC midnight ("calendar dates"); the university runs on Asia/Tashkent time.
export const TZ = "Asia/Tashkent";

/** Today's calendar date in Tashkent as UTC midnight. */
export function todayDate(): Date {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // YYYY-MM-DD
  return new Date(`${iso}T00:00:00Z`);
}

export function parseDate(value: string | undefined | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(+d) ? null : d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 03.10.2026 */
export function formatDate(d: Date): string {
  const [y, m, day] = isoDate(d).split("-");
  return `${day}.${m}.${y}`;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** 1 = Monday … 7 = Sunday */
export function dayOfWeek(d: Date): number {
  return ((d.getUTCDay() + 6) % 7) + 1;
}

export function mondayOf(d: Date): Date {
  return addDays(d, 1 - dayOfWeek(d));
}
