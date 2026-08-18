/**
 * Shared date/time formatting for the internal (staff) UI (Block 41).
 *
 * The whole authenticated app renders in Swiss German, so date and time
 * formatting is centralised here instead of being re-declared per component.
 * Keeps every timestamp visually consistent (medium date, short time) and
 * gives us a single place to adjust the locale later.
 *
 * NOTE: the loginless customer page is intentionally NOT routed through this —
 * it formats via its own de/fr/it i18n helper.
 */
const LOCALE = 'de-CH';

/** Accept an ISO string or a Date; anything falsy formats to an empty string. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Medium date + short time, e.g. "18. Aug. 2026, 14:05". */
export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

/** Medium date only, e.g. "18. Aug. 2026" — matches the date part of formatDateTime. */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString(LOCALE, { dateStyle: 'medium' }) : '';
}
