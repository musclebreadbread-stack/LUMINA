import { expect, test } from '@playwright/test';

import { dismissConsentBanner, setLocaleCookie } from './helpers';

test('cognitive pilot entry keeps the score release gate visible', async ({ page, context }) => {
  await setLocaleCookie(context, 'en');
  await page.goto('/cognitive');
  await dismissConsentBanner(page);

  await expect(page.getByText(/current.*pilot|pilot/i).first()).toBeVisible();
  await expect(page.getByText(/IQ|percentile/i).first()).toBeVisible();
  await expect(page.getByText(/withheld until a Korean adult norm/i).first()).toBeVisible();
  await expect(page.getByText(/theoretical.*(estimate|approximation)/i)).toHaveCount(0);
  await expect(page.getByText(/sub[- ]scores.*withheld|answer keys.*withheld/i).last()).toBeVisible();
});
