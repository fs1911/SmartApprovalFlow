import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Leading emoji/icon (decorative — hidden from assistive tech). */
  icon: string;
  /** Optional heading (rendered as <h2>); omit for compact card empties. */
  title?: string;
  /** Explanatory copy. */
  description?: ReactNode;
  /** Optional call-to-action (e.g. a button/link). */
  action?: ReactNode;
  /**
   * 'page' (default) = full dashed panel for a whole empty view;
   * 'card' = compact, centered variant for use inside an existing card.
   */
  variant?: 'page' | 'card';
}

/**
 * Shared empty-state block (Block 42). Unifies the previously hand-rolled
 * empties across the app (approvals list, dashboard, notifications) so they
 * share one structure, icon treatment and a11y handling.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'page',
}: EmptyStateProps) {
  const isCard = variant === 'card';
  return (
    <div
      className={isCard ? undefined : 'empty'}
      style={isCard ? { textAlign: 'center', padding: 'var(--space-6) 0' } : undefined}
    >
      <div className="empty__icon" aria-hidden>
        {icon}
      </div>
      {title && <h2>{title}</h2>}
      {description && (
        <p className="subtle" style={{ maxWidth: 380, margin: '0 auto 16px' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
