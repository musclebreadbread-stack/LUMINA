import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/** Life Path / Destiny values are always reduced to 1-9, or kept as a master number (11, 22, 33). */
const MASTER_OR_SINGLE_DIGIT = /^(?:[1-9]|11|22|33)$/;

/**
 * Fills the birth-date fieldset on the numerology form.
 *
 * The year input (type="number") and the two selects (month, day) have no
 * translated, cross-locale-stable accessible names worth depending on, but
 * they are the *only* spinbutton/comboboxes on the page, so role + position
 * is a stable, locale-independent way to target them.
 */
async function fillBirthDate(
  page: import('@playwright/test').Page,
  { year, month, day }: { year: number; month: number; day: number },
) {
  await page.getByRole('spinbutton').fill(String(year));
  const selects = page.getByRole('combobox');
  await selects.nth(0).selectOption(String(month));
  await selects.nth(1).selectOption(String(day));
}

/** The name field is the only plain text input on the numerology form. */
function nameField(page: import('@playwright/test').Page) {
  return page.getByRole('textbox');
}

/** The big numeral shown on each NumberPlate card ("glyph" is a bespoke class, not a Tailwind utility). */
function numberGlyphs(page: import('@playwright/test').Page) {
  return page.locator('span.glyph');
}

/** Locates a NumberPlate title (or any other <p> with this exact text) without colliding with the
 * aside summary text, which can render the identical string ("생애수") when there is no destiny card. */
function cardTitle(page: import('@playwright/test').Page, exactText: string) {
  return page
    .locator('div[id^="calculation-numerology-"] > p:first-of-type')
    .filter({ hasText: new RegExp(`^${exactText}$`) });
}

test.describe('Numerology flow', () => {
  test('reuses the saved Saju birth date in the numerology form', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);

    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();
    await page.getByRole('spinbutton').fill('1988');
    await page.getByRole('button', { name: '사주 원국 보기' }).click();
    await page.waitForURL(/\/r\/[^/?#]+$/);

    await page.goto('/numerology');
    await dismissConsentBanner(page);
    await expect(page.getByRole('spinbutton')).toHaveValue('1988');
  });

  test('ko: birth date + name shows both Life Path and Destiny cards', async ({ page, context }) => {
    // Locale resolution falls back to the browser's Accept-Language header when no cookie is
    // set (see src/i18n/request.ts), and Playwright's default Chromium context reports "en-US" —
    // so Korean must be pinned explicitly rather than relied on as an implicit default here.
    await setLocaleCookie(context, 'ko');
    await page.goto('/numerology');
    await dismissConsentBanner(page);

    await fillBirthDate(page, { year: 1990, month: 5, day: 20 });
    await nameField(page).fill('HONG GILDONG');

    await page.getByRole('button', { name: '숫자 보기' }).click();

    await expect(page).toHaveURL(/\/numerology\/result\?/);
    await dismissConsentBanner(page);

    const url = new URL(page.url());
    expect(url.searchParams.get('year')).toBe('1990');
    expect(url.searchParams.get('month')).toBe('5');
    expect(url.searchParams.get('day')).toBe('20');
    expect(url.searchParams.get('name')).toBe('HONG GILDONG');

    await expect(cardTitle(page, '생애수')).toBeVisible();
    await expect(cardTitle(page, '운명수')).toBeVisible();

    const glyphs = numberGlyphs(page);
    await expect(glyphs).toHaveCount(2);
    for (const value of await glyphs.allTextContents()) {
      expect(value.trim()).toMatch(MASTER_OR_SINGLE_DIGIT);
    }
  });

  test('ko: birth date without a name shows only the Life Path card plus a name CTA', async ({
    page,
    context,
  }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/numerology');
    await dismissConsentBanner(page);

    await fillBirthDate(page, { year: 1988, month: 11, day: 3 });
    // Name intentionally left blank.

    await page.getByRole('button', { name: '숫자 보기' }).click();

    await expect(page).toHaveURL(/\/numerology\/result\?/);
    await dismissConsentBanner(page);

    const url = new URL(page.url());
    expect(url.searchParams.get('year')).toBe('1988');
    expect(url.searchParams.get('month')).toBe('11');
    expect(url.searchParams.get('day')).toBe('3');
    expect(url.searchParams.has('name')).toBe(false);

    await expect(cardTitle(page, '생애수')).toBeVisible();
    await expect(cardTitle(page, '운명수')).toHaveCount(0);

    const glyphs = numberGlyphs(page);
    await expect(glyphs).toHaveCount(1);
    await expect(glyphs.first()).toHaveText(MASTER_OR_SINGLE_DIGIT);

    // noDestinyNote + noDestinyCta
    await expect(page.getByText('로마자 이름을 넣으면 운명수도 함께 볼 수 있습니다.')).toBeVisible();
    await expect(page.getByRole('link', { name: '이름 넣고 다시 보기' })).toBeVisible();
  });

  test('en: birth date + name shows English "Life Path Number" / "Destiny Number" titles', async ({
    page,
    context,
  }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/numerology');
    await dismissConsentBanner(page);

    await fillBirthDate(page, { year: 1990, month: 5, day: 20 });
    await nameField(page).fill('HONG GILDONG');

    await page.getByRole('button', { name: 'View Numbers' }).click();

    await expect(page).toHaveURL(/\/numerology\/result\?/);
    await dismissConsentBanner(page);

    const url = new URL(page.url());
    expect(url.searchParams.get('name')).toBe('HONG GILDONG');

    await expect(cardTitle(page, 'Life Path Number')).toBeVisible();
    await expect(cardTitle(page, 'Destiny Number')).toBeVisible();

    const glyphs = numberGlyphs(page);
    await expect(glyphs).toHaveCount(2);
    for (const value of await glyphs.allTextContents()) {
      expect(value.trim()).toMatch(MASTER_OR_SINGLE_DIGIT);
    }
  });
});
