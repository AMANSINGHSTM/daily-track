const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseDateKey(value);
  return Number.isFinite(date.getTime()) && toDateKey(date) === value;
}

export function addDays(dateKey: string, amount: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function differenceInDays(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / DAY_IN_MS);
}

export function formatDate(dateKey: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...options,
  }).format(parseDateKey(dateKey));
}

export function formatLongDate(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

export function getRecentDateKeys(count: number, from = toDateKey(new Date())): string[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index - count + 1));
}

export function getCurrentWeekDateKeys(referenceDate: string, weekStartsOn: "monday" | "sunday"): string[] {
  const dayOfWeek = parseDateKey(referenceDate).getDay();
  const offset = weekStartsOn === "monday" ? (dayOfWeek + 6) % 7 : dayOfWeek;
  const weekStart = addDays(referenceDate, -offset);
  return Array.from({ length: offset + 1 }, (_, index) => addDays(weekStart, index));
}

export function getCurrentMonthDays(referenceDate = new Date()): Date[] {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const startOffset = (start.getDay() + 6) % 7;
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - startOffset);
  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function getThirtyDayRange(endDate = toDateKey(new Date())): string[] {
  return Array.from({ length: 30 }, (_, index) => addDays(endDate, index - 29));
}

export function getChallengeEndDate(startDate: string): string {
  return addDays(startDate, 29);
}