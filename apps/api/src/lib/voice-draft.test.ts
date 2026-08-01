import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceDraft, extractPrice, detectUrgency, detectCategory } from './voice-draft.js';

test('extractPrice: single amount with trailing currency', () => {
  const p = extractPrice('Ölwechsel für 120 CHF');
  assert.ok(p);
  assert.deepEqual([p!.minMinor, p!.maxMinor], [12000, 12000]);
});

test('extractPrice: range "zwischen X und Y Franken"', () => {
  const p = extractPrice('kostet zwischen 180 und 240 Franken');
  assert.ok(p);
  assert.deepEqual([p!.minMinor, p!.maxMinor], [18000, 24000]);
});

test('extractPrice: currency before the number (CHF 89)', () => {
  const p = extractPrice('Diagnose CHF 89');
  assert.deepEqual([p!.minMinor, p!.maxMinor], [8900, 8900]);
});

test('extractPrice: Swiss thousands + decimals (1\'200.50)', () => {
  const p = extractPrice("Getriebe 1'200.50 Franken");
  assert.deepEqual([p!.minMinor, p!.maxMinor], [120050, 120050]);
});

test('extractPrice: a bare count is not a price', () => {
  assert.equal(extractPrice('2 Schrauben ersetzen'), null);
});

test('detectUrgency', () => {
  assert.equal(detectUrgency('Das ist sicherheitsrelevant'), 'HIGH');
  assert.equal(detectUrgency('sehr dringend bitte'), 'HIGH');
  assert.equal(detectUrgency('kann warten, kein Stress'), 'LOW');
  assert.equal(detectUrgency('Bremsbeläge ersetzen'), 'MEDIUM');
});

test('parseVoiceDraft: full dictation → subject, items, prices, urgency', () => {
  const draft = parseVoiceDraft(
    'Bremsbeläge vorne ersetzen, kostet zwischen 180 und 240 Franken. ' +
      'Außerdem Ölwechsel für 120 CHF. Das ist sicherheitsrelevant.',
  );
  assert.equal(draft.urgency, 'HIGH');
  assert.equal(draft.items.length, 2, 'the urgency remark must not become a position');
  assert.equal(draft.items[0]!.title, 'Bremsbeläge vorne ersetzen');
  assert.deepEqual(draft.items[0]!.priceBand, { minMinor: 18000, maxMinor: 24000, currency: 'CHF' });
  assert.equal(draft.items[1]!.title, 'Ölwechsel');
  assert.deepEqual(draft.items[1]!.priceBand, { minMinor: 12000, maxMinor: 12000, currency: 'CHF' });
  assert.equal(draft.subject, 'Bremsbeläge vorne ersetzen');
  assert.ok(draft.description?.includes('Bremsbeläge'));
});

test('detectCategory maps common workshop terms', () => {
  assert.equal(detectCategory('Bremsbeläge vorne ersetzen'), 'SAFETY');
  assert.equal(detectCategory('Ölwechsel'), 'MAINTENANCE');
  assert.equal(detectCategory('Fehlerspeicher auslesen'), 'DIAGNOSTIC');
  assert.equal(detectCategory('Kotflügel lackieren'), 'REPAIR');
});

test('parseVoiceDraft assigns a category per position', () => {
  const draft = parseVoiceDraft(
    'Bremsbeläge vorne ersetzen für 200 Franken. Außerdem Ölwechsel für 120 CHF.',
  );
  assert.equal(draft.items[0]!.category, 'SAFETY');
  assert.equal(draft.items[1]!.category, 'MAINTENANCE');
});

test('parseVoiceDraft: item without a price has no priceBand', () => {
  const draft = parseVoiceDraft('Luftfilter tauschen');
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0]!.title, 'Luftfilter tauschen');
  assert.equal(draft.items[0]!.priceBand, undefined);
  assert.equal(draft.urgency, 'MEDIUM');
});

test('parseVoiceDraft: empty transcript yields an empty, safe draft', () => {
  const draft = parseVoiceDraft('   ');
  assert.equal(draft.subject, '');
  assert.deepEqual(draft.items, []);
  assert.equal(draft.description, undefined);
});

test('parseVoiceDraft: strips leading filler from the title', () => {
  const draft = parseVoiceDraft('Wir müssen die Bremsscheiben hinten ersetzen für 300 Franken');
  assert.equal(draft.items[0]!.title, 'die Bremsscheiben hinten ersetzen');
  assert.deepEqual(draft.items[0]!.priceBand, { minMinor: 30000, maxMinor: 30000, currency: 'CHF' });
});
