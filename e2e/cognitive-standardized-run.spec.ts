import { expect, test } from '@playwright/test';

import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.skip(!process.env.E2E_COGNITIVE_DB, 'requires a live Neon database with the pilot item bank seeded (set E2E_COGNITIVE_DB=1)');

test('completing all 20 pilot items keeps unapproved scores withheld', async ({ page, context }) => {
  test.setTimeout(150_000);
  await setLocaleCookie(context, 'en');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/cognitive');
  await dismissConsentBanner(page);

  await page.getByRole('checkbox', { name: /anonymous operational storage/i }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/cognitive\/run\/[A-Za-z0-9_-]+$/, { timeout: 15_000 });

  // Turbopack dev compiles each Server Action route on first invocation, which can take well
  // over 5s the very first time it's hit — generous timeouts here absorb that one-time cold
  // start rather than racing it (see the concurrency note atop playwright.config.ts).
  for (let itemIndex = 0; itemIndex < 20; itemIndex += 1) {
    const firstOptionLabel = page.locator('fieldset label').first();
    await expect(firstOptionLabel).toBeVisible({ timeout: 20_000 });
    const currentAssignment = await firstOptionLabel.locator('input').first().getAttribute('name');

    await firstOptionLabel.click();
    await expect(page.getByRole('button', { name: /submit answer/i })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole('button', { name: /submit answer/i }).click();

    if (itemIndex < 19) {
      await expect(page.locator(`fieldset label input[name="${currentAssignment}"]`)).toHaveCount(0, { timeout: 20_000 });
    }
  }

  await expect(page).toHaveURL(/\/cognitive\/result\/[A-Za-z0-9_-]+$/, { timeout: 20_000 });
  await expect(page.getByText(/IQ, percentile, sub-scores.*withheld/i).first()).toBeVisible();
  await expect(page.getByText(/theoretical-distribution estimate/i)).toHaveCount(0);
  await expect(page.getByText(/95% confidence interval/i)).toHaveCount(0);
});
