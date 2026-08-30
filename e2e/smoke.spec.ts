import { expect, test } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

test('home page loads and shows the LUMINA title', async ({ page }) => {
  await page.goto('/');
  await dismissConsentBanner(page);

  await expect(page).toHaveTitle(/LUMINA/);
  await expect(page.locator('head link[rel="icon"][type="image/png"]')).toHaveAttribute(
    'href',
    /\/icon(?:\.png|\?)/,
  );
  await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    /\/apple-icon(?:\.png|\?)/,
  );
  await expect(page.locator('#mandala .mandala-node-link').first()).toBeVisible();
  await expect(page.locator('#feature-hub a.portal-card').first()).toBeVisible();
});
