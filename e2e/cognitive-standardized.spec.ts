import { expect, test } from '@playwright/test';

import { dismissConsentBanner, setLocaleCookie } from './helpers';

test('standardized entry keeps the score release gate visible', async ({ page, context }) => {
  await setLocaleCookie(context, 'en');
  await page.goto('/cognitive');
  await dismissConsentBanner(page);

  await expect(page.getByText(/current.*pilot|pilot/i).first()).toBeVisible();
  await expect(page.getByText(/IQ|percentile/i).first()).toBeVisible();
  await expect(page.getByText(/theoretical.*(estimate|approximation)/i).first()).toBeVisible();
  await expect(page.getByText(/subscores.*withheld|answer keys stay withheld/i).last()).toBeVisible();
});
