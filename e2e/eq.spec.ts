import { expect, test, type Page } from '@playwright/test';
import { ITEMS } from '@engine/eq/items';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * SSEIT (33-item emotional intelligence) survey flow.
 *
 * Same DOM shape as the IPIP-50 / SD3 forms (src/components/eq/SurveyForm.tsx):
 * a `<li id="item-{id}">` per item with five `<label>` elements wrapping a
 * `sr-only` radio input, one per Likert value 1..5 in that DOM order.
 *
 * The share code carries five 12-bit fields (four subscales + the total raw
 * score), so `/s/eq/<code>` is 3 + 5*2 + 1 = 14 characters.
 */

const TOTAL_ITEMS = ITEMS.length;
const SHARE_CODE_LENGTH = 14;

async function answerAll(page: Page): Promise<void> {
  for (const [index, item] of ITEMS.entries()) {
    const value = ((item.id - 1) % 5) + 1;
    await page.locator(`#item-${item.id}`).locator('label').nth(value - 1).click();
    if (index < ITEMS.length - 1 && (index + 1) % 9 === 0) {
      await page.locator('form nav button').last().click();
    }
  }
}

test.describe('SSEIT emotional intelligence survey', () => {
  test('completes the flow and shares a /s/eq/<code> link that renders in a brand-new browser context', async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(90_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setLocaleCookie(context, 'en');
    await page.goto('/eq', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerAll(page);

    await page.getByRole('button', { name: 'View results', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/eq/result\\?r=[1-5]{${TOTAL_ITEMS}}$`));
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { name: 'Emotional Intelligence Result', exact: true })).toBeVisible();
    await expect(page.getByTestId('scientific-score-plot')).toBeVisible();

    await page.getByRole('button', { name: 'Copy Link', exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(new RegExp(`^/s/eq/[0-9A-Za-z_-]{${SHARE_CODE_LENGTH}}$`));
    expect(copied).not.toContain('?r=');
    expect(copied).not.toContain('?run=');

    // 저장소를 전혀 공유하지 않는 새 컨텍스트에서도 같은 요약이 그대로 재현되는지 증명한다.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    const shareResponse = await freshPage.goto(copied);
    expect(shareResponse?.ok()).toBe(true);
    await expect(freshPage.getByRole('heading', { level: 1 })).toBeVisible();
    // 총점은 SSEIT의 1차 지표라, 요약 페이지가 원점수 없이 하위요인만 보여 주면 실패시킨다.
    await expect(freshPage.getByText(/Total score \(SSEIT\)/)).toBeVisible();
    await expect(freshPage.getByText(/Raw score \d+ \/ 165/)).toBeVisible();

    const ogImageUrl = await freshPage.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImageUrl).toBeTruthy();
    const imageResponse = await freshContext.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');
    // 삽화 없이 활자·막대만 그린 카드의 현실적인 바이트 하한(빈 브랜드 카드보다는 커야 한다).
    expect((await imageResponse.body()).byteLength).toBeGreaterThan(15_000);

    await freshContext.close();
  });
});
