import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * Astrology (점성술) flow: Saju report -> Astrology nav link -> /r/<data>/astro.
 * Covers the chart wheel, planetary positions table, and (in English) the
 * aspects section heading and Big Three sign names.
 */

const PLANET_ROWS_KO = [
  '태양', '달', '수성', '금성', '화성', '목성', '토성', '천왕성', '해왕성', '명왕성',
];

const PLANET_ROWS_EN = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

test.describe('Astrology flow (Korean, default locale)', () => {
  // No locale cookie is set — the app falls back to the Accept-Language header, then to
  // Korean. Pin the browser's locale to Korean so this resolves deterministically
  // regardless of the host machine's OS locale (Playwright's default browser locale
  // otherwise follows the OS and would send an "en" Accept-Language header here).
  test.use({ locale: 'ko-KR' });

  test('navigates from the Saju report to the astrology chart and shows planetary positions', async ({ page }) => {
    await page.goto('/');
    await dismissConsentBanner(page);

    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();
    await page.getByRole('button', { name: '사주 원국 보기' }).click();
    await page.waitForURL(/\/r\/[^/]+$/);
    await dismissConsentBanner(page);

    await page.getByRole('link', { name: '점성술' }).click();
    await page.waitForURL(/\/r\/[^/]+\/astro$/);
    await dismissConsentBanner(page);

    // Chart wheel renders as an SVG with role="img" and a stable aria-label.
    const wheel = page.getByRole('img', { name: /출생 차트 휠/ });
    await expect(wheel).toBeVisible();
    await expect(wheel.locator('circle').first()).toBeVisible();

    // Planetary positions table: scope to the "천체 위치" section.
    const planetsSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /천체 위치/ }) });
    await expect(planetsSection).toBeVisible();

    const rows = planetsSection.locator('tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(rows.filter({ hasText: '태양' })).toBeVisible();
    await expect(rows.filter({ hasText: '달' })).toBeVisible();

    for (const name of PLANET_ROWS_KO) {
      await expect(rows.filter({ hasText: name })).toHaveCount(1);
    }
  });
});

test.describe('Astrology flow (English locale)', () => {
  test.use({ locale: 'en-US' });

  test('shows English planet names, aspects heading, and Big Three sign names', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');

    await page.goto('/');
    await dismissConsentBanner(page);

    await page.locator('#feature-hub').getByRole('heading', { name: 'Saju', exact: true, level: 3 }).click();
    await page.getByRole('button', { name: 'View Saju Chart' }).click();
    await page.waitForURL(/\/r\/[^/]+$/);
    await dismissConsentBanner(page);

    await page.getByRole('link', { name: 'Astrology' }).click();
    await page.waitForURL(/\/r\/[^/]+\/astro$/);
    await dismissConsentBanner(page);

    // Chart wheel renders.
    const wheel = page.getByRole('img', { name: /Birth chart wheel/ });
    await expect(wheel).toBeVisible();

    // Planetary positions table shows all 10 bodies in English.
    const planetsSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: /Planetary Positions/ }) });
    await expect(planetsSection).toBeVisible();

    const rows = planetsSection.locator('tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(rows.filter({ hasText: 'Sun' })).toBeVisible();
    await expect(rows.filter({ hasText: 'Moon' })).toBeVisible();

    for (const name of PLANET_ROWS_EN) {
      await expect(rows.filter({ hasText: name })).toHaveCount(1);
    }

    // Aspects section heading reads "Aspects".
    await expect(page.getByRole('heading', { name: /Aspects/ })).toBeVisible();

    // Big Three (Sun/Moon/Ascendant) block shows English sign names, e.g. "Gemini".
    await expect(page.getByText('Gemini', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('쌍둥이자리')).toHaveCount(0);
  });
});
