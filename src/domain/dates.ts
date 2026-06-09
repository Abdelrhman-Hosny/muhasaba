/** Format a Date as a local-timezone YYYY-MM-DD key. */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
/** Today's local date key. */
export function todayKey(): string {
  return toLocalDateKey(new Date());
}

/** Parse a YYYY-MM-DD key into a local Date at midnight. */
function fromLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole-day difference (a - b) ignoring time. */
function dayDiff(a: string, b: string): number {
  const ms = fromLocalDateKey(a).getTime() - fromLocalDateKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** A date is editable if it is today or up to `daysBack` days before today (no future). */
export function isEditableDate(date: string, today: string, daysBack: number): boolean {
  const diff = dayDiff(today, date);
  return diff >= 0 && diff <= daysBack;
}

/** Editable dates, today first → oldest last. Length is daysBack + 1. */
export function editableDates(today: string, daysBack: number): string[] {
  const base = fromLocalDateKey(today);
  const out: string[] = [];
  for (let i = 0; i <= daysBack; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(toLocalDateKey(d));
  }
  return out;
}
