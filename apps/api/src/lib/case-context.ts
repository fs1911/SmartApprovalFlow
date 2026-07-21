/**
 * Build the template variable context for a case's outbound messages.
 * Keeps the mapping in one place so the send and reminder flows stay identical.
 */
import { formatPriceBand } from '@saf/ui';
import type { TemplateContext } from './templates.js';

interface CaseForContext {
  subject: string;
  expiresAt?: Date | null;
  customer?: { name: string | null } | null;
  vehicle?: { plate?: string | null; make?: string | null; model?: string | null; year?: number | null } | null;
  items: { priceMinMinor: number | null; priceMaxMinor: number | null; currency: string }[];
  tenant: { name: string; brandName?: string | null; currency: string };
}

export function buildCaseContext(c: CaseForContext, linkUrl: string): TemplateContext {
  const totalMin = c.items.reduce((s, it) => s + (it.priceMinMinor ?? 0), 0) || null;
  const totalMax = c.items.reduce((s, it) => s + (it.priceMaxMinor ?? 0), 0) || null;
  const vehicle =
    [c.vehicle?.make, c.vehicle?.model, c.vehicle?.year].filter(Boolean).join(' ') ||
    c.vehicle?.plate ||
    'Ihr Fahrzeug';

  return {
    customerName: c.customer?.name ?? '',
    subject: c.subject,
    vehicle,
    priceBand: formatPriceBand(totalMin, totalMax, c.tenant.currency),
    link: linkUrl,
    expiresAt: c.expiresAt ? c.expiresAt.toLocaleDateString('de-CH') : '',
    workspaceName: c.tenant.brandName ?? c.tenant.name,
    // Contact hint is workspace-configurable later; a sensible default for now.
    workspaceContact: c.tenant.brandName ?? c.tenant.name,
  };
}
