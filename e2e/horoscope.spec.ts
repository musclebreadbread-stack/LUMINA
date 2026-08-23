import { expect, test, type Locator, type Page } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * Daily horoscope flow — the app's "quick, no-input" feature.
 * Covers: sign picker tabs, picking a zodiac sign, direct navigation to a
 * Chinese zodiac result, same-day determinism, and English-locale rendering.
 */

interface LocaleLabels {
  readonly tabZodiac: string;
  readonly tabChinese: string;
  readonly today: string;
  readonly relationshipLabel: string;
  readonly workLabel: string;
}

const LABELS: Record<'ko' | 'en', LocaleLabels> = {
  ko: { tabZodiac: '별자리', tabChinese: '띠', today: '오늘', relationshipLabel: '관계', workLabel: '할 일' },
  en: {
    tabZodiac: 'Zodiac Sign',
    tabChinese: 'Zodiac Animal',
    today: 'Today',
    relationshipLabel: 'Relationships',
    workLabel: 'Tasks',
  },
};

const KOREAN_RE = /[가-힣]/;

/**
 * TodaySync (src/components/horoscope/TodaySync.tsx) silently swaps the URL to the
 * visitor's local calendar date shortly after mount when it differs from the
 * server's UTC-based default date, which can change the rendered content. Give it
 * a moment to settle before reading text, so we capture the final state rather
 * than a transitional one.
 */
async function settleAfterNav(page: Page): Promise<void> {
  await page.waitForTimeout(500);
}

interface TodaySections {
  readonly mood: string;
  readonly relationship: string;
  readonly work: string;
  readonly tip: string;
}

/** Reads the mood/relationship/work/tip text out of the "Today" section on a horoscope result page. */
async function readTodaySections(page: Page, labels: LocaleLabels): Promise<TodaySections> {
  const section: Locator = page
    .locator('main section')
    .filter({ has: page.getByRole('heading', { name: new RegExp(labels.today) }) })
    .first();
  await expect(section).toBeVisible();

  const mood = (await section.locator('p').first().innerText()).trim();
  const tip = (await section.locator('p').last().innerText()).trim();
  const relationship = (
    await section
      .getByText(labels.relationshipLabel, { exact: true })
      .locator('xpath=following-sibling::p[1]')
      .innerText()
  ).trim();
  const work = (
    await section
      .getByText(labels.workLabel, { exact: true })
      .locator('xpath=following-sibling::p[1]')
      .innerText()
  ).trim();

  return { mood, relationship, work, tip };
}

test.describe('Daily horoscope (Korean default)', () => {
  // Playwright/Chromium's default Accept-Language starts with "en", which would
  // otherwise make src/i18n/request.ts pick English before ever falling back to
  // its Korean default. Pin the emulated browser locale to Korean so these tests
  // exercise the app's real "no cookie" default instead of a test-runner artifact.
  test.use({ locale: 'ko-KR' });

  test('sign picker shows both the zodiac and Chinese zodiac tabs', async ({ page }) => {
    await page.goto('/horoscope');
    await dismissConsentBanner(page);

    await expect(page.getByRole('tab', { name: LABELS.ko.tabZodiac, exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: LABELS.ko.tabChinese, exact: true })).toBeVisible();
  });

  test('derives and highlights the saved profile signs', async ({ page }) => {
    await page.goto('/horoscope');
    await page.evaluate(() => {
      localStorage.setItem(
        'lumina.profile.v1',
        JSON.stringify({
          year: 1995,
          month: 6,
          day: 15,
          calendar: 'solar',
          isLeapMonth: false,
          hour: 12,
          minute: 0,
          gender: 'unspecified',
          placeLabel: '서울',
          lat: 37.5665,
          lng: 126.978,
          timeZone: 'Asia/Seoul',
        }),
      );
    });
    await page.reload();
    await dismissConsentBanner(page);

    await expect(page.locator('a[aria-current="true"]')).toHaveCount(1);
    await expect(page.getByText('저장된 프로필', { exact: true })).toBeVisible();
  });

  test('picking a zodiac sign navigates to its result with all sections rendered', async ({ page }) => {
    await page.goto('/horoscope');
    await dismissConsentBanner(page);

    await page.getByRole('link', { name: '사자자리' }).click();
    await expect(page).toHaveURL(/\/horoscope\/zodiac\/leo(?:\?.*)?$/);
    await dismissConsentBanner(page);
    await settleAfterNav(page);

    const sections = await readTodaySections(page, LABELS.ko);
    expect(sections.mood.length).toBeGreaterThan(0);
    expect(sections.relationship.length).toBeGreaterThan(0);
    expect(sections.work.length).toBeGreaterThan(0);
    expect(sections.tip.length).toBeGreaterThan(0);
  });

  // Direct navigation (requirement 3) and the reload-determinism check
  // (requirement 4) share one test and one browser context rather than two,
  // so that no other worker/test can race a concurrent request against this
  // exact same dynamic URL in parallel — the dev server otherwise showed
  // cross-request bleed between simultaneous requests to the same route.
  test('a Chinese zodiac animal result renders correctly and stays the same across a reload', async ({
    page,
  }) => {
    await page.goto('/horoscope/chinese/dragon');
    await dismissConsentBanner(page);
    await settleAfterNav(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('용');

    const first = await readTodaySections(page, LABELS.ko);
    expect(first.mood.length).toBeGreaterThan(0);
    expect(first.relationship.length).toBeGreaterThan(0);
    expect(first.work.length).toBeGreaterThan(0);
    expect(first.tip.length).toBeGreaterThan(0);

    await page.reload();
    await dismissConsentBanner(page);
    await settleAfterNav(page);
    const second = await readTodaySections(page, LABELS.ko);

    expect(second).toEqual(first);
  });
});

test.describe('Daily horoscope (English locale)', () => {
  test('English locale renders the horoscope result in English', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/horoscope/zodiac/leo');
    await dismissConsentBanner(page);
    await settleAfterNav(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Leo');
    await expect(page.getByText(LABELS.en.relationshipLabel, { exact: true })).toBeVisible();
    await expect(page.getByText(LABELS.en.workLabel, { exact: true })).toBeVisible();

    const sections = await readTodaySections(page, LABELS.en);
    expect(sections.mood.length).toBeGreaterThan(0);
    expect(sections.relationship.length).toBeGreaterThan(0);
    expect(sections.work.length).toBeGreaterThan(0);
    expect(sections.tip.length).toBeGreaterThan(0);

    expect(KOREAN_RE.test(sections.mood)).toBe(false);
    expect(KOREAN_RE.test(sections.relationship)).toBe(false);
    expect(KOREAN_RE.test(sections.work)).toBe(false);
    expect(KOREAN_RE.test(sections.tip)).toBe(false);
  });
});
