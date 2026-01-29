import { endOfDay, format, parseISO, startOfDay } from "date-fns";

/**
 * Date format used in URL query params (clean, no special chars)
 * Example: "2026-01-21"
 */
const URL_DATE_FORMAT = "yyyy-MM-dd";

/**
 * Converts a Date to a clean URL-friendly string
 * @example formatDateForUrl(new Date(2026, 0, 21)) => "2026-01-21"
 */
export function formatDateForUrl(date: Date): string {
  return format(date, URL_DATE_FORMAT);
}

/**
 * Parses a URL date string to start of day ISO string for filtering
 * @example parseDateFromUrl("2026-01-21", "start") => "2026-01-21T00:00:00.000Z"
 */
export function parseDateFromUrl(
  dateStr: string,
  boundary: "start" | "end",
): string {
  const date = parseISO(dateStr);
  const boundedDate = boundary === "start" ? startOfDay(date) : endOfDay(date);
  return boundedDate.toISOString();
}

/**
 * Parses a URL date string back to a Date object
 * @example parseDateStringToDate("2026-01-21") => Date
 */
export function parseDateStringToDate(dateStr: string): Date {
  return parseISO(dateStr);
}

/**
 * Validates if a string is a valid URL date format
 * @example isValidUrlDate("2026-01-21") => true
 * @example isValidUrlDate("2026-01-21T00:00:00.000Z") => false
 */
export function isValidUrlDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}
