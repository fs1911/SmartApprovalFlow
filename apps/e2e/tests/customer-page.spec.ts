import { test, expect } from '@playwright/test';
import { loadFixtures } from './fixtures.js';

const fx = loadFixtures();

/**
 * Critical loginless customer paths. Each decision test uses its own seeded
 * case (fresh token) so the terminal state one test leaves behind never leaks
 * into another. All strings are the German customer-page copy from @saf/ui.
 */

test('loads the request and shows the workshop, subject and cost', async ({ page }) => {
  await page.goto(`/a/${fx.approveToken}`);
  await expect(page.getByRole('heading', { name: 'E2E Freigabe' })).toBeVisible();
  await expect(page.getByText('Voraussichtliche Kosten')).toBeVisible();
  // Primary decision affordance is present.
  await expect(page.getByRole('button', { name: /Alle Arbeiten freigeben/ })).toBeVisible();
});

test('approve all → success state', async ({ page }) => {
  await page.goto(`/a/${fx.approveToken}`);
  await page.getByRole('button', { name: /Alle Arbeiten freigeben/ }).click();
  await expect(page.getByRole('heading', { name: 'Vielen Dank — freigegeben!' })).toBeVisible();
});

test('decline all → answer-received state', async ({ page }) => {
  await page.goto(`/a/${fx.declineToken}`);
  await page.getByRole('button', { name: 'Alles ablehnen' }).click();
  // Reveals the reason step; confirm the decline.
  await page.getByRole('button', { name: 'Arbeiten ablehnen' }).click();
  await expect(page.getByRole('heading', { name: 'Antwort erhalten' })).toBeVisible();
});

test('request callback → callback-requested state', async ({ page }) => {
  await page.goto(`/a/${fx.callbackToken}`);
  await page.getByRole('button', { name: /Rückruf wünschen/ }).click();
  await page.getByLabel('Ihre Telefonnummer (optional)').fill('+41 79 123 45 67');
  await page.getByRole('button', { name: 'Rückruf anfordern' }).click();
  await expect(page.getByRole('heading', { name: 'Rückruf angefragt' })).toBeVisible();
});

test('decide individually → partial approval', async ({ page }) => {
  await page.goto(`/a/${fx.individualToken}`);
  await page.getByRole('button', { name: 'Einzeln entscheiden' }).click();
  // Decline the second position, approve the first (default), then confirm.
  await page.getByRole('button', { name: 'Bremsscheiben vorne ersetzen: Ablehnen' }).click();
  await page.getByRole('button', { name: 'Auswahl bestätigen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Vielen Dank — Auswahl erhalten!' }),
  ).toBeVisible();
});

test('expired link shows the expired message', async ({ page }) => {
  await page.goto(`/a/${fx.expiredToken}`);
  await expect(page.getByRole('heading', { name: 'Link nicht verfügbar' })).toBeVisible();
  await expect(page.getByText(/abgelaufen/)).toBeVisible();
});

test('invalid link shows the invalid message', async ({ page }) => {
  await page.goto(`/a/${fx.invalidToken}`);
  await expect(page.getByRole('heading', { name: 'Link nicht verfügbar' })).toBeVisible();
  await expect(page.getByText(/ungültig oder wurde bereits zurückgezogen/)).toBeVisible();
});

test.describe('localization via ?lang', () => {
  test('French (?lang=fr)', async ({ page }) => {
    await page.goto(`/a/${fx.localeToken}?lang=fr`);
    await expect(page.locator('div.public-page')).toHaveAttribute('lang', 'fr');
    await expect(page.getByText('Coûts prévus')).toBeVisible();
    await expect(page.getByRole('button', { name: /Approuver tous les travaux/ })).toBeVisible();
  });

  test('Italian (?lang=it)', async ({ page }) => {
    await page.goto(`/a/${fx.localeToken}?lang=it`);
    await expect(page.locator('div.public-page')).toHaveAttribute('lang', 'it');
    await expect(page.getByText('Costi previsti')).toBeVisible();
    await expect(page.getByRole('button', { name: /Approva tutti i lavori/ })).toBeVisible();
  });

  test('defaults to German for the tenant', async ({ page }) => {
    await page.goto(`/a/${fx.localeToken}`);
    await expect(page.locator('div.public-page')).toHaveAttribute('lang', 'de');
    await expect(page.getByText('Voraussichtliche Kosten')).toBeVisible();
  });
});
