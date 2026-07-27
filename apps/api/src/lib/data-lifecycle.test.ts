import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caseRetentionCutoff, shapeCaseExport } from './data-lifecycle.js';

test('caseRetentionCutoff: disabled when months <= 0', () => {
  assert.equal(caseRetentionCutoff(0), null);
  assert.equal(caseRetentionCutoff(-3), null);
});

test('caseRetentionCutoff: subtracts months from now', () => {
  const now = new Date('2026-06-15T00:00:00Z');
  const cut = caseRetentionCutoff(6, now)!;
  assert.equal(cut.toISOString().slice(0, 7), '2025-12');
});

test('shapeCaseExport produces a portable, ISO-stamped object', () => {
  const out = shapeCaseExport({
    reference: 'AC-2026-0001',
    subject: 'Bremsen',
    description: null,
    status: 'APPROVED',
    urgency: 'MEDIUM',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    sentAt: new Date('2026-01-01T11:00:00Z'),
    respondedAt: new Date('2026-01-02T09:00:00Z'),
    customer: { name: 'Anna', email: 'a@e.com', phone: null },
    vehicle: { plate: 'ZH1', make: 'VW', model: 'Golf', year: 2019 },
    items: [
      { title: 'Beläge', description: null, category: 'SAFETY', priceMinMinor: 1000, priceMaxMinor: 2000, currency: 'CHF', decision: null },
    ],
    decisions: [{ decision: 'APPROVE', note: null, createdAt: new Date('2026-01-02T09:00:00Z') }],
    attachments: [{ fileName: 'p.jpg', contentType: 'image/jpeg', sizeBytes: 100, createdAt: new Date('2026-01-01T10:30:00Z') }],
    auditEvents: [{ type: 'CASE_CREATED', actorType: 'USER', actorLabel: null, createdAt: new Date('2026-01-01T10:00:00Z') }],
  });
  assert.equal(out.reference, 'AC-2026-0001');
  assert.equal(out.customer?.name, 'Anna');
  assert.equal(out.createdAt, '2026-01-01T10:00:00.000Z');
  assert.equal(out.decisions[0]!.createdAt, '2026-01-02T09:00:00.000Z');
  assert.equal(out.auditTrail[0]!.at, '2026-01-01T10:00:00.000Z');
  assert.equal(out.items.length, 1);
});
