'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createApprovalCaseSchema } from '@saf/types';
import { api, ApiClientError } from '@/lib/api';

export interface CreateState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Convert CHF major-unit string ("180.50") to minor units (18050). */
function toMinor(v: FormDataEntryValue | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(String(v).replace(',', '.'));
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100);
}

export async function createApprovalCase(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const priceMin = toMinor(formData.get('priceMin'));
  const priceMax = toMinor(formData.get('priceMax'));

  const payload = {
    subject: String(formData.get('subject') ?? '').trim(),
    description: String(formData.get('issueSummary') ?? '').trim() || undefined,
    urgency: (String(formData.get('urgency') ?? 'MEDIUM') || 'MEDIUM') as
      | 'LOW'
      | 'MEDIUM'
      | 'HIGH',
    customer: {
      name: String(formData.get('customerName') ?? '').trim(),
      email: String(formData.get('customerEmail') ?? '').trim() || undefined,
      phone: String(formData.get('customerPhone') ?? '').trim() || undefined,
    },
    vehicle: {
      plate: String(formData.get('vehiclePlate') ?? '').trim() || undefined,
      make: String(formData.get('vehicleMake') ?? '').trim() || undefined,
      model: String(formData.get('vehicleModel') ?? '').trim() || undefined,
    },
    items: [
      {
        title: String(formData.get('recommendationSummary') ?? '').trim(),
        description: String(formData.get('issueSummary') ?? '').trim() || undefined,
        category: 'REPAIR' as const,
        priceBand:
          priceMin != null || priceMax != null
            ? {
                minMinor: priceMin ?? priceMax ?? 0,
                maxMinor: priceMax ?? priceMin ?? 0,
                currency: 'CHF',
              }
            : undefined,
      },
    ],
    sendImmediately: formData.get('sendImmediately') === 'on',
  };

  // Validate client-side-equivalent before hitting the API for nicer messages.
  const parsed = createApprovalCaseSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: 'Bitte prüfen Sie die markierten Felder.', fieldErrors };
  }

  let id: string;
  try {
    const created = await api.request<{ id: string }>('/api/v1/approval-cases', {
      method: 'POST',
      body: parsed.data,
      idempotencyKey: randomUUID(),
    });
    id = created.id;
  } catch (e) {
    const msg = e instanceof ApiClientError ? e.message : 'Speichern fehlgeschlagen.';
    return { ok: false, error: msg };
  }

  redirect(`/approvals/${id}?created=1`);
}
