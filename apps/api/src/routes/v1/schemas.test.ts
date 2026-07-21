import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalCaseSchema, customerRespondSchema, priceBandSchema } from '@saf/types';

test('createApprovalCase requires a subject, a customer and at least one item', () => {
  const bad = createApprovalCaseSchema.safeParse({ subject: '' });
  assert.equal(bad.success, false);

  const ok = createApprovalCaseSchema.safeParse({
    subject: 'Bremsen hinten',
    customer: { name: 'Peter Beispiel', email: 'p@example.ch' },
    items: [{ title: 'Bremsbeläge ersetzen' }],
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    // defaults applied
    assert.equal(ok.data.urgency, 'MEDIUM');
    assert.equal(ok.data.sendImmediately, false);
    assert.equal(ok.data.items[0]!.category, 'REPAIR');
  }
});

test('customer must have at least email or phone', () => {
  const res = createApprovalCaseSchema.safeParse({
    subject: 'Test',
    customer: { name: 'Ohne Kontakt' },
    items: [{ title: 'x' }],
  });
  assert.equal(res.success, false);
});

test('priceBand rejects max < min', () => {
  assert.equal(priceBandSchema.safeParse({ minMinor: 500, maxMinor: 100 }).success, false);
  assert.equal(priceBandSchema.safeParse({ minMinor: 100, maxMinor: 500 }).success, true);
});

test('customerRespond only accepts known decisions', () => {
  assert.equal(customerRespondSchema.safeParse({ decision: 'APPROVE' }).success, true);
  assert.equal(customerRespondSchema.safeParse({ decision: 'MAYBE' }).success, false);
});
