import { expect, test, type Page } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * IPIP-50 Big Five survey flow — the longest form in the app (50 items).
 *
 * `/psychometrics` has no separate landing/intro screen: the hero copy and the
 * 50-item form render on the same page (see src/app/psychometrics/page.tsx),
 * so the flow is simply "load the page, answer every item, submit".
 *
 * Each item (src/components/psychometrics/SurveyForm.tsx) is a `<li id="item-{id}">`
 * containing five `<label>` elements (one per Likert value 1..5, in that DOM
 * order) that wrap a visually-hidden (`sr-only`) radio input. Clicking the
 * label toggles the radio, exactly like a real user would, without depending
 * on the scale-word text that only renders at `sm:` breakpoints and up.
 */

const TOTAL_ITEMS = 50;

/** Clicks the Likert option for item `id`, cycling 1..5..1..5 deterministically so factor scores end up non-uniform. */
async function answerItem(page: Page, id: number): Promise<void> {
  const value = ((id - 1) % 5) + 1;
  await page.locator(`#item-${id}`).locator('label').nth(value - 1).click();
}

async function answerItemsInRange(page: Page, from: number, to: number): Promise<void> {
  for (let id = from; id <= to; id += 1) {
    await answerItem(page, id);
  }
}

test.describe('IPIP-50 psychometrics survey (Korean, default locale)', () => {
  // Locale is resolved server-side as cookie -> Accept-Language header -> "ko"
  // default (src/i18n/request.ts). No cookie is set here (that's the point of
  // this test), but Chromium's own default Accept-Language is "en-US", which
  // would otherwise negotiate to English before ever reaching the "ko"
  // fallback. Pin the browser's own locale to a non-English one so this test
  // actually exercises that default-locale fallback path, the way a real
  // Korean-language visitor with no saved preference would.
  test.use({ locale: 'ko-KR' });

  test('answers all 50 items, surfaces then clears the unanswered warning, and renders the 5-factor result', async ({
    page,
  }) => {
    // Next.js dev mode compiles this route on first request, so allow extra
    // time beyond the default for the initial load.
    test.setTimeout(60_000);
    await page.goto('/psychometrics', { timeout: 60_000 });
    await dismissConsentBanner(page);

    // Leave the very last item unanswered and try to submit.
    await answerItemsInRange(page, 1, TOTAL_ITEMS - 1);

    const submitButton = page.getByRole('button', { name: '결과 보기', exact: true });
    await submitButton.click();

    // Submission is blocked client-side — still on the survey, warning shown.
    // Matched by its exact visible text rather than getByRole('alert', {name}):
    // Next's built-in route announcer div also carries role="alert" (which
    // would make a bare role query ambiguous), and — confirmed by tracing a
    // hung run — combining role="alert" with an exact Korean accessible-name
    // match never resolves even though the DOM updates almost instantly, so
    // text content is the reliable way to find this element.
    await expect(page).toHaveURL(/\/psychometrics$/);
    const warning = page.getByText('아직 답하지 않은 문항이 1개 있습니다.', { exact: true });
    await expect(warning).toBeVisible();

    // Answer the last item — the warning disappears immediately.
    await answerItem(page, TOTAL_ITEMS);
    await expect(warning).toHaveCount(0);

    // Now submission succeeds and navigates to the result URL with encoded answers.
    await submitButton.click();
    await expect(page).toHaveURL(/\/psychometrics\/result\?r=[1-5]{50}$/);
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { name: '성향 검사 결과' })).toBeVisible();

    const factorNames = ['외향성', '우호성', '성실성', '정서 안정성', '개방성'];
    for (const name of factorNames) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    // Each of the 5 factor bars shows a "평균 X.X / 5.0" mean readout.
    await expect(page.getByText(/^평균 \d\.\d \/ 5\.0$/)).toHaveCount(5);
  });

  test('preserves an in-progress draft after a reload', async ({ page }) => {
    await page.goto('/psychometrics');
    await dismissConsentBanner(page);

    await answerItemsInRange(page, 1, 3);
    await page.reload();
    await dismissConsentBanner(page);

    await expect(page.locator('#item-1 input[type="radio"]').nth(0)).toBeChecked();
    await expect(page.locator('#item-2 input[type="radio"]').nth(1)).toBeChecked();
    await expect(page.locator('#item-3 input[type="radio"]').nth(2)).toBeChecked();
  });
});

test.describe('IPIP-50 psychometrics survey (English locale)', () => {
  test('answers all 50 items in English and renders an English result', async ({ page, context }) => {
    // Next.js dev mode compiles this route (and the result route below) on
    // first request, so allow extra time beyond the default.
    test.setTimeout(60_000);
    await setLocaleCookie(context, 'en');
    await page.goto('/psychometrics', { timeout: 60_000 });
    await dismissConsentBanner(page);

    // Must still answer all 50 to reach the result — reuse the same answering loop.
    await answerItemsInRange(page, 1, TOTAL_ITEMS);

    const submitButton = page.getByRole('button', { name: 'View Result', exact: true });
    await submitButton.click();

    await expect(page).toHaveURL(/\/psychometrics\/result\?r=[1-5]{50}$/, { timeout: 15_000 });
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { name: 'Personality Test Result' })).toBeVisible();

    const factorNames = [
      'Extraversion',
      'Agreeableness',
      'Conscientiousness',
      'Emotional Stability',
      'Openness',
    ];
    for (const name of factorNames) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    // Each of the 5 factor bars shows a "Mean X.X / 5.0" mean readout.
    await expect(page.getByText(/^Mean \d\.\d \/ 5\.0$/)).toHaveCount(5);
  });

  test('shares a /s/bigfive/<code> link that renders in a brand-new browser context', async ({ page, context, browser }) => {
    test.setTimeout(60_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setLocaleCookie(context, 'en');
    await page.goto('/psychometrics', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerItemsInRange(page, 1, TOTAL_ITEMS);

    await page.getByRole('button', { name: 'View Result', exact: true }).click();
    await expect(page).toHaveURL(/\/psychometrics\/result\?r=[1-5]{50}$/, { timeout: 15_000 });
    await dismissConsentBanner(page);

    await page.getByRole('button', { name: 'Copy Link', exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^\/s\/bigfive\/[0-9A-Za-z_-]{14}$/);
    expect(copied).not.toContain('?r=');

    // 저장소를 전혀 공유하지 않는 새 컨텍스트에서도 같은 요약이 그대로 재현되는지 증명한다.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(copied);
    await expect(freshPage.getByRole('heading', { level: 1 })).toBeVisible();
    await freshContext.close();
  });
});
