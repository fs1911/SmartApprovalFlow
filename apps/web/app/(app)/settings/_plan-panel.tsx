'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPriceBand } from '@saf/ui';
import { changePlan } from './actions';

interface LimitStatus {
  limit: number | null;
  used: number;
  remaining: number | null;
  withinLimit: boolean;
  softWarning: boolean;
}
interface PlanDef {
  key: string;
  label: string;
  priceMinor: number;
  limits: { casesPerMonth: number | null; seats: number | null };
}
export interface BillingData {
  subscription: { planKey: string; status: string };
  usage: { cases: LimitStatus; seats: LimitStatus; period: { start: string } };
  plans: PlanDef[];
  provider: string;
}

function limitLabel(v: number | null) {
  return v === null ? 'unbegrenzt' : String(v);
}

function UsageBar({ label, s }: { label: string; s: LimitStatus }) {
  const pct = s.limit === null ? 0 : Math.min(100, Math.round((s.used / s.limit) * 100));
  const tone = !s.withinLimit ? 'var(--color-danger-500)' : s.softWarning ? 'var(--color-warning-500)' : 'var(--color-brand-500)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
        <span>{label}</span>
        <span className="subtle">
          {s.used} / {limitLabel(s.limit)}
        </span>
      </div>
      {s.limit !== null && (
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          style={{ height: 8, borderRadius: 999, background: 'var(--color-surface-subtle)', overflow: 'hidden', marginTop: 4 }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: tone }} />
        </div>
      )}
    </div>
  );
}

export function PlanPanel({ data, canManage }: { data: BillingData; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = data.subscription.planKey;

  const overLimit = !data.usage.cases.withinLimit || !data.usage.seats.withinLimit;
  const softWarn = data.usage.cases.softWarning || data.usage.seats.softWarning;

  async function onChange(planKey: string) {
    setBusy(planKey);
    setError(null);
    const res = await changePlan(planKey);
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? 'Planwechsel fehlgeschlagen.');
      return;
    }
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
      return;
    }
    router.refresh();
  }

  return (
    <div className="card">
      <div className="card__body stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0 }}>Plan &amp; Nutzung</h2>
          <span className="badge badge--info">{current}</span>
        </div>

        {overLimit && (
          <div className="alert alert--danger" role="alert">
            Ein Limit Ihres Plans ist erreicht. Upgraden Sie, um ohne Unterbrechung weiterzuarbeiten.
          </div>
        )}
        {!overLimit && softWarn && (
          <div className="alert alert--info" role="status">
            Sie nähern sich einem Plan-Limit. Ein Upgrade schafft rechtzeitig Luft.
          </div>
        )}

        <UsageBar label="Gesendete Freigaben (Monat)" s={data.usage.cases} />
        <UsageBar label="Sitze (Mitglieder inkl. Einladungen)" s={data.usage.seats} />

        {error && (
          <div className="alert alert--danger" role="alert">
            {error}
          </div>
        )}

        {canManage ? (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {data.plans.map((p) => (
              <div
                key={p.key}
                className="card"
                style={{ flex: '1 1 180px', borderColor: p.key === current ? 'var(--color-brand-500)' : undefined }}
              >
                <div className="card__body" style={{ padding: 'var(--space-3)' }}>
                  <div style={{ fontWeight: 700 }}>{p.label}</div>
                  <div className="subtle" style={{ fontSize: 'var(--text-sm)' }}>
                    {p.priceMinor === 0 ? 'Kostenlos' : `${formatPriceBand(p.priceMinor, p.priceMinor, 'CHF')}/Mt.`}
                  </div>
                  <div className="subtle" style={{ fontSize: 'var(--text-xs)', margin: '6px 0' }}>
                    {limitLabel(p.limits.casesPerMonth)} Freigaben/Mt. · {limitLabel(p.limits.seats)} Sitze
                  </div>
                  {p.key === current ? (
                    <button className="btn btn--secondary btn--block" disabled>
                      Aktueller Plan
                    </button>
                  ) : (
                    <button
                      className="btn btn--primary btn--block"
                      disabled={busy !== null}
                      aria-busy={busy === p.key}
                      onClick={() => void onChange(p.key)}
                    >
                      {busy === p.key ? 'Wechselt…' : `Zu ${p.label} wechseln`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="subtle">Planänderungen sind Inhaber:innen/Admins vorbehalten.</p>
        )}

        <p className="subtle" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
          Abrechnung über {data.provider === 'mock' ? 'Dev-/Mock-Provider (keine echten Zahlungen)' : data.provider}.
        </p>
      </div>
    </div>
  );
}
