import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from './templates.js';

test('renders known placeholders and tolerates whitespace', () => {
  const out = renderTemplate('Hallo {{customerName}} – {{ subject }}', {
    customerName: 'Peter',
    subject: 'Bremsen',
  });
  assert.equal(out, 'Hallo Peter – Bremsen');
});

test('unknown or nullish placeholders become empty, never throw', () => {
  assert.equal(renderTemplate('a {{missing}} b', {}), 'a  b');
  assert.equal(renderTemplate('x {{v}}', { v: null }), 'x ');
});
