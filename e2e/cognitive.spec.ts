import { expect, test } from '@playwright/test';

import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.describe('standardized cognitive pilot', () => {
  test('shows the research boundary and a separate public practice route', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/cognitive');
    await dismissConsentBanner(page);

    await expect(page.getByText('Standardized cognitive ability pilot', { exact: true })).toBeVisible();
    await expect(page.getByText(/confidence interval.*theoretical assumption|theoretical assumption/i).first()).toBeVisible();
    await expect(page.getByText(/stay withheld until that norm/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /practice/i })).toBeVisible();
    await expect(page.getByText(/pilot/i).first()).toBeVisible();

    await page.getByRole('link', { name: /practice/i }).click();
    await expect(page).toHaveURL(/\/cognitive\/practice$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /show explanation/i }).first()).toBeDisabled();
  });

  test('legacy score query is read-only and cannot expose answer material', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/cognitive/result?r=1111111111111111');
    await dismissConsentBanner(page);

    await expect(page).toHaveURL(/\/cognitive\/result\?r=1111111111111111$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/read-only/i);
    const content = await page.locator('main').textContent();
    expect(content).not.toContain('correctOptionId');
    expect(content).not.toContain('theta');
    expect(content).not.toContain('server_seed');
  });
});
