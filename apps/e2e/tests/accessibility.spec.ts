import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadFixtures } from './fixtures.js';

const fx = loadFixtures();

/**
 * Accessibility smoke: no serious/critical WCAG 2.1 A/AA violations on the two
 * most important public surfaces. This is a guard-rail, not a full audit — see
 * docs/accessibility.md for the manual checklist.
 */

const IMPACT_BLOCKING = new Set(['serious', 'critical']);

async function scan(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.filter((v) => IMPACT_BLOCKING.has(v.impact ?? ''));
}

test('customer page has no serious/critical a11y violations', async ({ page }) => {
  await page.goto(`/a/${fx.approveToken}`);
  await expect(page.getByRole('heading', { name: 'E2E Freigabe' })).toBeVisible();
  const blocking = await scan(page);
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test('login page has no serious/critical a11y violations', async ({ page }) => {
  await page.goto('/login');
  const blocking = await scan(page);
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
