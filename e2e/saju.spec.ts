import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * Saju (사주) golden path — the app's primary feature.
 *
 * Flow: fill-free submit of the pre-filled BirthForm on "/" -> client-side
 * navigation to a self-contained "/r/<encoded-data>" share link -> the four
 * Saju pillars and ShareBar render on the report page. Because the app has
 * no signup/login and no server-side storage (see src/lib/share.ts), the
 * encoded URL alone must be enough to reproduce the same report in a brand
 * new browser context with no prior localStorage.
 */

const REPORT_URL_PATTERN = /\/r\/[^/?#]+$/;
const PILLAR_MARKS = ['時', '日', '月', '年'] as const;

test.describe('Saju golden path (Korean locale)', () => {
  // Playwright's Chromium context sends "Accept-Language: en-US" by default,
  // which the app's locale resolution (cookie -> Accept-Language -> ko
  // default; see src/i18n/request.ts) would otherwise resolve to English.
  // Pin the locale cookie explicitly so these tests exercise Korean
  // deterministically regardless of the runner's default Accept-Language.
  test('submits the pre-filled birth form and renders a full report', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);

    // The birth-info form is hidden until the "Saju" hub card is chosen
    // (progressive disclosure — see src/components/home/SajuRevealContext.tsx).
    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();

    const submit = page.getByRole('button', { name: '사주 원국 보기' });
    await expect(submit).toBeVisible();
    await submit.click();

    // Lands on a "/r/<encoded-data>" URL without a hardcoded encoded value.
    // waitForURL (rather than expect().toHaveURL, whose default assertion
    // timeout is much shorter) tolerates Next dev's on-demand compile of the
    // report route on its first hit.
    await page.waitForURL(REPORT_URL_PATTERN);
    await expect(page).toHaveURL(REPORT_URL_PATTERN);
    await dismissConsentBanner(page);

    // The four Saju pillars (時/日/月/年) render.
    for (const mark of PILLAR_MARKS) {
      await expect(page.getByText(mark, { exact: true })).toBeVisible();
    }

    const spiritArtwork = page.locator('.character-result-art .character-result-image');
    await expect(spiritArtwork).toHaveCount(1);
    await expect(page.locator('.character-result-art svg')).toHaveCount(0);

    // Share / Copy Link / Save as PDF are present.
    await expect(page.getByRole('button', { name: '공유하기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '링크 복사' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF로 저장' })).toBeVisible();
  });

  test('reopening the same share link in a fresh browser context renders the same birth date', async ({
    page,
    context,
    browser,
  }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);
    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();
    await page.getByRole('button', { name: '사주 원국 보기' }).click();
    await page.waitForURL(REPORT_URL_PATTERN);
    await expect(page).toHaveURL(REPORT_URL_PATTERN);
    await dismissConsentBanner(page);

    const reportUrl = page.url();
    const heading = page.getByRole('heading', { level: 1 });
    // URL navigation can complete before the App Router has swapped the
    // landing tree for the report tree. Wait for the report-specific birth
    // heading instead of accidentally capturing the landing H1.
    await expect(heading).toHaveText(/\d{4}년 \d{1,2}월 \d{1,2}일/);
    const originalHeadingText = (await heading.textContent())?.trim();
    expect(originalHeadingText).toBeTruthy();

    // Fresh context = no localStorage, no prior profile. The share link must
    // still reproduce the identical report, since everything needed lives in
    // the URL itself (src/lib/share.ts encodeProfile/decodeProfile). Pin the
    // same locale cookie so the comparison isn't confounded by the fresh
    // context's own default Accept-Language.
    const freshContext = await browser.newContext();
    try {
      await setLocaleCookie(freshContext, 'ko');
      const freshPage = await freshContext.newPage();
      await freshPage.goto(reportUrl);
      await dismissConsentBanner(freshPage);

      const freshHeading = freshPage.getByRole('heading', { level: 1 });
      await expect(freshHeading).toBeVisible();
      await expect(freshHeading).toHaveText(originalHeadingText!);
    } finally {
      await freshContext.close();
    }
  });

  test('clicking Save as PDF triggers window.print without throwing a JS error', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);
    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();
    await page.getByRole('button', { name: '사주 원국 보기' }).click();
    await page.waitForURL(REPORT_URL_PATTERN);
    await expect(page).toHaveURL(REPORT_URL_PATTERN);
    await dismissConsentBanner(page);

    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.getByRole('button', { name: 'PDF로 저장' }).click();
    // window.print() runs synchronously in the click handler; give any
    // resulting console/page errors a brief moment to surface.
    await page.waitForTimeout(500);

    expect(consoleErrors).toEqual([]);
  });
});

test.describe('Saju golden path (English locale)', () => {
  test('submits the pre-filled form and renders an English report', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/');
    await dismissConsentBanner(page);

    await page.locator('#feature-hub').getByRole('heading', { name: 'Saju', exact: true, level: 3 }).click();

    const submit = page.getByRole('button', { name: 'View Saju Chart' });
    await expect(submit).toBeVisible();
    await submit.click();

    await page.waitForURL(REPORT_URL_PATTERN);
    await expect(page).toHaveURL(REPORT_URL_PATTERN);
    await dismissConsentBanner(page);

    for (const mark of PILLAR_MARKS) {
      await expect(page.getByText(mark, { exact: true })).toBeVisible();
    }

    // Section headings are translated (saju.sectionPillars = "Saju Chart").
    await expect(page.getByRole('heading', { name: /Saju Chart/ })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy Link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save as PDF' })).toBeVisible();

    await page.getByRole('link', { name: 'Integrated Report', exact: true }).click();
    await page.waitForURL(/\/r\/[^/]+\/all$/);
    await expect(page.getByRole('heading', { level: 2, name: /Today's Fortune/ })).toBeVisible();
    await expect(page.getByText('Relationships', { exact: true })).toBeVisible();
  });
});
