/**
 * Onboarding checklist + activation signals (Block 10).
 *
 * `computeOnboarding` is a *pure* function of booleans derived from tenant state
 * (unit-tested). The route gathers the signals from the DB; this decides which
 * steps are done, what's next, and whether the workspace is "activated".
 */
export interface OnboardingSignals {
  /** White-label branding filled in (brand name / colour / contact). */
  hasBranding: boolean;
  /** More than just the founding owner — someone was invited or joined. */
  hasTeam: boolean;
  /** At least one approval case exists. */
  hasCase: boolean;
  /** At least one case was actually sent to a customer. */
  hasSentCase: boolean;
  /** At least one customer responded (approved/declined/callback/partial). */
  hasResponse: boolean;
}

export interface OnboardingStep {
  key: string;
  title: string;
  done: boolean;
  /** Deep link the UI can send the user to. */
  href: string;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  /** All steps done. */
  complete: boolean;
  /** The first not-yet-done step, or null when complete. */
  nextStep: OnboardingStep | null;
  /**
   * Activation = the workspace reached its "aha" moment: a case was sent and a
   * customer responded. The core value proved itself.
   */
  activated: boolean;
}

export function computeOnboarding(s: OnboardingSignals): OnboardingState {
  const steps: OnboardingStep[] = [
    { key: 'branding', title: 'Werkstatt-Branding einrichten', done: s.hasBranding, href: '/settings' },
    { key: 'team', title: 'Erste Kolleg:innen einladen', done: s.hasTeam, href: '/members' },
    { key: 'first_case', title: 'Ersten Freigabefall anlegen', done: s.hasCase, href: '/approvals/new' },
    { key: 'first_send', title: 'Anfrage an einen Kunden senden', done: s.hasSentCase, href: '/approvals' },
    { key: 'first_response', title: 'Erste Kundenreaktion erhalten', done: s.hasResponse, href: '/approvals' },
  ];
  const completedCount = steps.filter((x) => x.done).length;
  const nextStep = steps.find((x) => !x.done) ?? null;
  return {
    steps,
    completedCount,
    totalCount: steps.length,
    complete: completedCount === steps.length,
    nextStep,
    activated: s.hasSentCase && s.hasResponse,
  };
}
