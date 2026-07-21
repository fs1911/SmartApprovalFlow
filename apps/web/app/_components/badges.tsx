import { STATUS_PRESENTATION, URGENCY_PRESENTATION } from '@saf/ui';

export function StatusBadge({ status }: { status: string }) {
  const p = STATUS_PRESENTATION[status] ?? { label: status, tone: 'neutral' as const };
  return (
    <span className={`badge badge--${p.tone}`}>
      <span className="badge__dot" />
      {p.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const p = URGENCY_PRESENTATION[urgency] ?? { label: urgency, tone: 'neutral' };
  if (urgency === 'MEDIUM') return <span className="badge badge--info">{p.label}</span>;
  if (urgency === 'HIGH') return <span className="badge badge--danger">Dringend</span>;
  return <span className="badge badge--neutral">{p.label}</span>;
}
