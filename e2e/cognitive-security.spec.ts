import { expect, test } from '@playwright/test';

import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.describe('standardized cognitive security boundary', () => {
  test('invalid run ids render a recovery page without private fields', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/cognitive/run/not-a-uuid');
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/no longer available|not available/i);
    const content = await page.locator('main').textContent();
    expect(content).not.toMatch(/correctOptionId|server_seed|theta|raw_responses/i);
  });

  test('the public entry payload contains no answer key or scoring state', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/cognitive');
    await dismissConsentBanner(page);

    const scripts = await page.locator('script').allTextContents();
    const payload = scripts.join('\n');
    expect(payload).not.toMatch(/correctOptionId|server_seed|raw_responses|standard_error/i);
  });
});
