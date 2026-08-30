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
  "psychometrics/types/axes/at-a.webp",
  "psychometrics/types/axes/at-t.webp",
  "psychometrics/types/axes/vw-v.webp",
  "psychometrics/types/axes/vw-w.webp",
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

test.describe('MBTI Type Analysis', () => {
  test('serves all generated axis and type artwork', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/psychometrics/types');
    await dismissConsentBanner(page);

    const responses = await Promise.all(GENERATED_ARTWORK.map((asset) => page.request.get(`/${asset}`)));
    for (const response of responses) {
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/webp');
    }
    await expect(page.locator('img')).toHaveCount(7);
  });

  test('reuses the IPIP-50 flow and renders six Korean axes', async ({ page, context }) => {
    test.setTimeout(60_000);
    await setLocaleCookie(context, 'ko');
    await page.goto('/psychometrics?to=types', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerAll(page);

    await page.getByRole('button', { name: '결과 보기', exact: true }).click();
    await expect(page).toHaveURL(/\/psychometrics\/types\/result\?r=[1-5]{50}$/);
    await dismissConsentBanner(page);

    // answerAll()은 모든 문항을 극단값으로 밀어 여섯 축 모두(AT/VW 포함) 경계를 벗어난다 —
    // withdrawal/volatility 규준 평균·표준편차가 서로 달라 극단에서도 대비가 남기 때문이다.
    await expect(page.locator('.jungian-type-code')).toHaveText(/^[A-Z]{4}-[A-Z]{2}$/);
    for (const heading of ['에너지 선호', '정보 수집 선호', '판단 기준 선호', '생활 방식 선호', '정체성 선호', '정서표현 선호']) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('img', { name: /MBTI 경향을 상징하는 자기성찰 일러스트/ })).toBeVisible();
    await expect(page.getByText(/공식 MBTI® 검사/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('[data-evidence-status="derived"]').first()).toBeVisible();
    await expect(page.getByTestId('scientific-score-plot')).toBeVisible();
  });

  test('keeps the light-panel secondary CTA visible and actionable', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/psychometrics/types');
    await dismissConsentBanner(page);

    const methodLink = page.getByRole('link', { name: 'MBTI를 어떻게 분석하나요?', exact: true });
    await expect(methodLink).toBeVisible();
    await expect(methodLink).toHaveAttribute('href', '/psychometrics?to=types');
    await expect(methodLink).toHaveCSS('color', 'rgb(18, 16, 13)');
    await methodLink.click();
    await expect(page).toHaveURL(/\/psychometrics\?to=types$/);
  });

  test('keeps the same response code between Big Five and MBTI result links', async ({ page, context }) => {
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

    await page.getByRole('link', { name: 'Open the original Big Five result', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/psychometrics/result\\?r=${code}$`));
    await page.getByRole('link', { name: 'View the MBTI Type Analysis →', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/psychometrics/types/result\\?r=${code}$`));
    await expect(page.getByRole('heading', { name: 'Energy preference', exact: true })).toBeVisible();
  });

  test('keeps all four letters open for a fixed neutral response link', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    const neutralCode = '3'.repeat(TOTAL_ITEMS);
    await page.goto(`/psychometrics/types/result?r=${neutralCode}`);
    await dismissConsentBanner(page);

    await expect(page.locator('.jungian-type-code')).toHaveText(/^[A-Z?]{4}-[A-Z?]{2}$/);
    await expect(page.locator('.jungian-type-code')).toContainText('?');
    await expect(page.getByText('At least one axis is close to the midpoint, so the full code remains open.', { exact: true })).toBeVisible();
  });

  test('shares a /s/jungian/<code> link that renders in a brand-new browser context', async ({ page, context, browser }) => {
    test.setTimeout(60_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setLocaleCookie(context, 'en');
    await page.goto('/psychometrics?to=types', { timeout: 60_000 });
    await dismissConsentBanner(page);
    await answerAll(page);
    await page.getByRole('button', { name: 'View Result', exact: true }).click();
    await expect(page).toHaveURL(/\/psychometrics\/types\/result\?r=[1-5]{50}$/);
    await dismissConsentBanner(page);

    await page.getByRole('button', { name: 'Copy Link', exact: true }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/^\/s\/jungian\/[0-9A-Za-z_-]{18}$/);
    expect(copied).not.toContain('?r=');
    expect(copied).not.toContain('?run=');

    // 저장소를 전혀 공유하지 않는 새 컨텍스트에서도 같은 요약이 그대로 재현되는지 증명한다.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(copied);
    await expect(freshPage.getByRole('heading', { level: 1 })).toBeVisible();
    await freshContext.close();
  });
});
