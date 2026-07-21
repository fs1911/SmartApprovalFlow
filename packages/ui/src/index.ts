/**
 * @saf/ui — shared UI layer.
 *
 * Block 1 intentionally ships design *tokens* (tokens.css) plus a small set of
 * shared constants, not a full React component library. Component primitives
 * (Button, Card, StatusBadge, Field, …) land in Block 2 once the web app's
 * real forms exist, so we build them against concrete usage rather than
 * speculatively. See docs/design-system.md.
 */

/** Status → presentation mapping, shared so API-ish labels stay consistent. */
export const STATUS_PRESENTATION: Record<
  string,
  { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  DRAFT: { label: 'Entwurf', tone: 'neutral' },
  SENT: { label: 'Gesendet', tone: 'info' },
  VIEWED: { label: 'Angesehen', tone: 'info' },
  APPROVED: { label: 'Freigegeben', tone: 'success' },
  DECLINED: { label: 'Abgelehnt', tone: 'danger' },
  CALLBACK: { label: 'Rückruf gewünscht', tone: 'warning' },
  EXPIRED: { label: 'Abgelaufen', tone: 'neutral' },
  CANCELLED: { label: 'Storniert', tone: 'neutral' },
};

/** Human-readable German labels for audit event types (customer-safe wording). */
export const AUDIT_LABELS: Record<string, string> = {
  CASE_CREATED: 'Fall erstellt',
  CASE_UPDATED: 'Fall aktualisiert',
  CASE_SENT: 'Anfrage gesendet',
  CASE_REMINDER_SENT: 'Erinnerung gesendet',
  CASE_LINK_VIEWED: 'Kunde hat den Link geöffnet',
  CASE_APPROVED: 'Kunde hat freigegeben',
  CASE_DECLINED: 'Kunde hat abgelehnt',
  CASE_CALLBACK_REQUESTED: 'Kunde wünscht einen Rückruf',
  CASE_EXPIRED: 'Link abgelaufen',
  CASE_CANCELLED: 'Fall storniert',
  MESSAGE_QUEUED: 'Nachricht eingereiht',
  MESSAGE_SENT: 'Nachricht gesendet',
  MESSAGE_FAILED: 'Nachricht fehlgeschlagen',
};

export const URGENCY_PRESENTATION: Record<string, { label: string; tone: string }> = {
  LOW: { label: 'Niedrig', tone: 'neutral' },
  MEDIUM: { label: 'Mittel', tone: 'info' },
  HIGH: { label: 'Hoch', tone: 'danger' },
};

/** Format a price band stored in minor units into a display string. */
export function formatPriceBand(
  minMinor?: number | null,
  maxMinor?: number | null,
  currency = 'CHF',
): string {
  if (minMinor == null && maxMinor == null) return '—';
  const fmt = (v: number) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(v / 100);
  if (minMinor != null && maxMinor != null && minMinor !== maxMinor) {
    return `${fmt(minMinor)} – ${fmt(maxMinor)}`;
  }
  return fmt((minMinor ?? maxMinor) as number);
}
