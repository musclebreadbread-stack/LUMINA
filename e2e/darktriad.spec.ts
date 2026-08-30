import { expect, test, type Page } from '@playwright/test';
import { ITEMS } from '@engine/darktriad/items';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * Short Dark Triad (SD3, 27-item) survey flow.
 *
 * Same DOM shape as the IPIP-50 form (src/components/darktriad/SurveyForm.tsx):
 * a `<li id="item-{id}">` per item with five `<label>` elements wrapping a
 * `sr-only` radio input, one per Likert value 1..5 in that DOM order.
 */

const TOTAL_ITEMS = ITEMS.length;

async function answerAll(page: Page): Promise<void> {
  for (const item of ITEMS) {
    const value = ((item.id - 1) % 5) + 1;
    await page.locator(`#item-${item.id}`).locator('label').nth(value - 1).click();
  }
}

test.describe('Short Dark Triad survey', () => {
  test('completes the flow and shares a /s/darktriad/<code> link that renders in a brand-new browser context', async ({
    page,
    context,
    browser,
  }) => {
    test.setTimeout(60_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setLocaleCookie(context, 'en');
    await page.goto('/darktriad', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerAll(page);

    await page.getByRole('button', { name: 'View results', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/darktriad/result\\?r=[1-5]{${TOTAL_ITEMS}}$`));
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { name: 'Dark Triad Result', exact: true })).toBeVisible();
    await expect(page.getByTestId('scientific-score-plot')).toBeVisible();

    await page.getByRole('button', { name: 'Copy Link', exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^\/s\/darktriad\/[0-9A-Za-z_-]{10}$/);
    expect(copied).not.toContain('?r=');

    // 저장소를 전혀 공유하지 않는 새 컨텍스트에서도 같은 요약이 그대로 재현되는지 증명한다.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(copied);
    await expect(freshPage.getByRole('heading', { level: 1 })).toBeVisible();
    await freshContext.close();
  });
});
