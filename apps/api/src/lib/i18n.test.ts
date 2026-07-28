import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, t, isLocale, LOCALES, DEFAULT_LOCALE, MESSAGES } from '@saf/ui';

test('isLocale recognises supported locales only', () => {
  assert.equal(isLocale('de'), true);
  assert.equal(isLocale('fr'), true);
  assert.equal(isLocale('it'), true);
  assert.equal(isLocale('en'), false);
  assert.equal(isLocale('rm'), false);
  assert.equal(isLocale(''), false);
});

test('resolveLocale falls back to German for empty/unknown input', () => {
  assert.equal(resolveLocale(), DEFAULT_LOCALE);
  assert.equal(resolveLocale(null, undefined), 'de');
  assert.equal(resolveLocale('en', 'es'), 'de');
});

test('resolveLocale honours the first matching preference', () => {
  assert.equal(resolveLocale('fr', 'de'), 'fr');
  assert.equal(resolveLocale('it'), 'it');
});

test('resolveLocale strips region subtags', () => {
  assert.equal(resolveLocale('fr-CH'), 'fr');
  assert.equal(resolveLocale('de-DE'), 'de');
  assert.equal(resolveLocale('IT-IT'), 'it');
});

test('resolveLocale parses Accept-Language lists with q-weights', () => {
  assert.equal(resolveLocale('fr-CH,fr;q=0.9,de;q=0.8'), 'fr');
  assert.equal(resolveLocale('en-US,en;q=0.9,it;q=0.7'), 'it');
  assert.equal(resolveLocale('en-US,en;q=0.9'), 'de');
});

test('resolveLocale prefers an explicit query over the tenant locale', () => {
  // page.tsx passes (searchParams.lang, workspace.locale)
  assert.equal(resolveLocale('it', 'fr-CH'), 'it');
  assert.equal(resolveLocale(undefined, 'fr-CH'), 'fr');
});

test('t returns the message for the chosen locale', () => {
  assert.equal(t('de', 'approvalRequest'), 'Freigabeanfrage');
  assert.equal(t('fr', 'approvalRequest'), 'Demande d’approbation');
  assert.equal(t('it', 'approvalRequest'), 'Richiesta di approvazione');
});

test('t interpolates named placeholders', () => {
  assert.equal(t('de', 'greeting', { name: 'Frau Meier' }), 'Guten Tag Frau Meier');
  assert.equal(t('fr', 'questions', { name: 'Garage Zürich' }), 'Des questions ? Contactez Garage Zürich');
});

test('t leaves unknown placeholders untouched and ignores extra vars', () => {
  assert.equal(t('de', 'greeting', { other: 'x' }), 'Guten Tag {name}');
});

test('t falls back to German for an unknown locale string', () => {
  assert.equal(t('en', 'approvalRequest'), 'Freigabeanfrage');
});

test('every locale defines every message key (no gaps)', () => {
  const germanKeys = Object.keys(MESSAGES[DEFAULT_LOCALE]);
  for (const loc of LOCALES) {
    const keys = Object.keys(MESSAGES[loc]);
    assert.deepEqual(keys.sort(), germanKeys.slice().sort(), `locale ${loc} key set differs`);
    const catalog = MESSAGES[loc] as unknown as Record<string, string>;
    for (const key of germanKeys) {
      assert.ok(catalog[key]!.length > 0, `locale ${loc} has empty message for ${key}`);
    }
  }
});
