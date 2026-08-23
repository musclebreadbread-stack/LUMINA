import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.describe('living mandala landing page', () => {
  test('keeps exploration entries in the server-rendered DOM', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await dismissConsentBanner(page);

    const entries = page.locator('#mandala .mandala-node-link');
    await expect(entries.first()).toBeVisible();
    await expect(page.getByRole('heading', { name: '내 안의 여러 나를,', exact: false })).toBeVisible();
    await expect(page.getByTestId('mandala-evidence')).toContainText('서울');
  });

  test('reduced motion keeps the CSS layer and does not mount a canvas', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await dismissConsentBanner(page);

    await expect(page.locator('.mandala-3d-layer')).toHaveAttribute('data-mandala-layer', '1');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('#mandala .mandala-node-link').first()).toBeVisible();
  });

  test('English locale translates the mandala copy and evidence caption', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/');
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { name: /Explore the selves/ })).toBeVisible();
    await expect(page.locator('#mandala .mandala-node-link').first()).toBeVisible();
    await expect(page.getByTestId('mandala-evidence')).toContainText('Seoul');
  });

  test('javascript-disabled Saju entry remains navigable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');

    await page.locator('#landing-fallback a[href="/saju"]').click();
    await expect(page).toHaveURL(/\/saju(?:#.*)?$/);
    await context.close();
  });
});
