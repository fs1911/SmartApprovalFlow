'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, ROLE_LABELS } from '@saf/types';
import { changeMemberRole } from './actions';

interface Member {
  id: string;
  role: string;
  roleLabel: string;
  user: { name: string; email: string } | null;
}

export function MemberRow({ member, canManage }: { member: Member; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="case-row" style={{ cursor: 'default' }}>
      <div>
        <div className="case-row__title">{member.user?.name ?? '—'}</div>
        <div className="case-row__meta">{member.user?.email}</div>
        {error && <div className="error">{error}</div>}
      </div>
      <div className="case-row__right">
        {canManage ? (
          <select
            value={member.role}
            disabled={pending}
            onChange={(e) => {
              const role = e.target.value;
              setError(null);
              startTransition(async () => {
                const res = await changeMemberRole(member.id, role);
                if (!res.ok) setError(res.error ?? 'Fehler');
                else router.refresh();
              });
            }}
            style={{ width: 'auto', padding: '6px 10px', fontSize: 'var(--text-sm)' }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="badge badge--neutral">{member.roleLabel}</span>
        )}
      </div>
    </div>
  );
}
