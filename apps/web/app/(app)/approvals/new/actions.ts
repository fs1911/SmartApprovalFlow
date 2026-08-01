'use server';

import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createApprovalCaseSchema, type VoiceDraft } from '@saf/types';
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

const CATEGORIES = ['SAFETY', 'MAINTENANCE', 'REPAIR', 'DIAGNOSTIC', 'OTHER'] as const;
type Category = (typeof CATEGORIES)[number];
function toCategory(v: FormDataEntryValue | null): Category {
  const s = String(v ?? '');
  return (CATEGORIES as readonly string[]).includes(s) ? (s as Category) : 'REPAIR';
}

/** Collect the dynamic `items[i].{title,category,description,priceMin,priceMax}` rows. */
function parseItems(formData: FormData) {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const m = /^items\[(\d+)\]\.(?:title|category|description|priceMin|priceMax)$/.exec(key);
    if (m) indices.add(Number(m[1]));
  }
  const items: {
    title: string;
    category: Category;
    description?: string;
    priceBand?: { minMinor: number; maxMinor: number; currency: 'CHF' };
  }[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const title = String(formData.get(`items[${i}].title`) ?? '').trim();
    const description = String(formData.get(`items[${i}].description`) ?? '').trim();
    const min = toMinor(formData.get(`items[${i}].priceMin`));
    const max = toMinor(formData.get(`items[${i}].priceMax`));
    // Skip fully empty rows so a stray blank row never blocks submission.
    if (!title && !description && min == null && max == null) continue;
    items.push({
      title,
      category: toCategory(formData.get(`items[${i}].category`)),
      description: description || undefined,
      priceBand:
        min != null || max != null
          ? { minMinor: min ?? max ?? 0, maxMinor: max ?? min ?? 0, currency: 'CHF' }
          : undefined,
    });
  }
  // Keep at least one (empty) item so validation reports items.0.title clearly.
  if (items.length === 0) items.push({ title: '', category: 'REPAIR' });
  return items;
}

export async function createApprovalCase(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
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
    items: parseItems(formData),
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

// --- Voice capture (Block 21) ----------------------------------------------

export interface VoiceActionResult {
  ok: boolean;
  error?: string;
  transcript?: string;
  draft?: VoiceDraft;
}

/**
 * Send a dictation to the API for transcription + draft parsing. Pass either
 * recorded audio (base64) or, for the local/mock provider, the transcript text
 * directly. Returns the transcript + advisory draft for the form to pre-fill.
 */
export async function transcribeVoice(input: {
  audioBase64?: string;
  contentType?: string;
  durationSec?: number;
  mockTranscript?: string;
}): Promise<VoiceActionResult> {
  try {
    const res = await api.request<{ transcript: string; draft: VoiceDraft }>(
      '/api/v1/voice/transcribe',
      { method: 'POST', body: input },
    );
    return { ok: true, transcript: res.transcript, draft: res.draft };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiClientError ? e.message : 'Transkription fehlgeschlagen.',
    };
  }
}
