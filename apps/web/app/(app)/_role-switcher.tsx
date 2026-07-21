'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS } from '@saf/types';
import { setRole } from './_role-actions';

/**
 * Dev role switcher — lets you experience the app as each role. Clearly labelled
 * as a demo control; not part of the real product surface.
 */
export function RoleSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label
      title="Demo: Rolle wechseln (ersetzt durch echte Anmeldung in Block 5)"
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span className="topbar__role" style={{ opacity: pending ? 0.5 : 1 }}>
        Demo-Rolle
      </span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const role = e.target.value;
          startTransition(async () => {
            await setRole(role);
            router.refresh();
          });
        }}
        style={{ width: 'auto', padding: '4px 8px', fontSize: 'var(--text-xs)' }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
