import { expect, test, type Page } from '@playwright/test';
import { ITEMS } from '@engine/psychometrics/items';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

const TOTAL_ITEMS = 50;
const GENERATED_ARTWORK = [
  "psychometrics/types/axes/ei-i.webp",
  "psychometrics/types/axes/ei-e.webp",
  "psychometrics/types/axes/sn-s.webp",
  "psychometrics/types/axes/sn-n.webp",
  "psychometrics/types/axes/tf-t.webp",
  "psychometrics/types/axes/tf-f.webp",
  "psychometrics/types/axes/jp-j.webp",
  "psychometrics/types/axes/jp-p.webp",
  "psychometrics/types/istj.webp",
  "psychometrics/types/isfj.webp",
  "psychometrics/types/infj.webp",
  "psychometrics/types/intj.webp",
  "psychometrics/types/istp.webp",
  "psychometrics/types/isfp.webp",
  "psychometrics/types/infp.webp",
  "psychometrics/types/intp.webp",
  "psychometrics/types/estp.webp",
  "psychometrics/types/esfp.webp",
  "psychometrics/types/enfp.webp",
  "psychometrics/types/entp.webp",
  "psychometrics/types/estj.webp",
  "psychometrics/types/esfj.webp",
  "psychometrics/types/enfj.webp",
  "psychometrics/types/entj.webp",
] as const;

async function answerAll(page: Page): Promise<void> {
  for (const item of ITEMS) {
    const value = item.key === "plus" ? 5 : 1;
    await page.locator(`#item-${item.id}`).locator('label').nth(value - 1).click();
  }
}

test.describe('Jungian Type Lens', () => {
  test('serves all generated axis and type artwork', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/psychometrics/types');
    await dismissConsentBanner(page);

    const responses = await Promise.all(GENERATED_ARTWORK.map((asset) => page.request.get(`/${asset}`)));
    for (const response of responses) {
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/webp');
    }
    await expect(page.locator('img')).toHaveCount(5);
  });

  test('reuses the IPIP-50 flow and renders four Korean axes', async ({ page, context }) => {
    test.setTimeout(60_000);
    await setLocaleCookie(context, 'ko');
    await page.goto('/psychometrics?to=types', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerAll(page);

    await page.getByRole('button', { name: '결과 보기', exact: true }).click();
    await expect(page).toHaveURL(/\/psychometrics\/types\/result\?r=[1-5]{50}$/);
    await dismissConsentBanner(page);

    await expect(page.locator('.jungian-type-code')).toHaveText(/^[A-Z?]{4}$/);
    for (const heading of ['에너지 방향', '정보 방향', '판단 방향', '생활 방향']) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('img', { name: /유형을 상징하는 자기성찰 일러스트/ })).toBeVisible();
    await expect(page.getByText(/공식 MBTI® 검사가 아닙니다/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('keeps the same response code between Big Five and Jungian result links', async ({ page, context }) => {
    test.setTimeout(60_000);
    await setLocaleCookie(context, 'en');
    await page.goto('/psychometrics?to=types', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerAll(page);
    await page.getByRole('button', { name: 'View Result', exact: true }).click();
    await expect(page).toHaveURL(/\/psychometrics\/types\/result\?r=([1-5]{50})$/);

    const url = new URL(page.url());
    const code = url.searchParams.get('r');
    expect(code).toMatch(/^[1-5]{50}$/);

    await page.getByRole('link', { name: 'Return to the Big Five result', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/psychometrics/result\\?r=${code}$`));
    await page.getByRole('link', { name: 'View as an MBTI type →', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/psychometrics/types/result\\?r=${code}$`));
    await expect(page.getByRole('heading', { name: 'Energy direction', exact: true })).toBeVisible();
  });

  test('keeps all four letters open for a fixed neutral response link', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    const neutralCode = '3'.repeat(TOTAL_ITEMS);
    await page.goto(`/psychometrics/types/result?r=${neutralCode}`);
    await dismissConsentBanner(page);

    await expect(page.locator('.jungian-type-code')).toHaveText(/^[A-Z?]{4}$/);
    await expect(page.locator('.jungian-type-code')).toContainText('?');
    await expect(page.getByText('At least one axis is close to the midpoint, so the full code remains open.', { exact: true })).toBeVisible();
  });
});
