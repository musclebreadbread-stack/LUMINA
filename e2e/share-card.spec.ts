import { expect, test } from '@playwright/test';
import { ITEMS_PER_DOMAIN as COGNITIVE_ITEMS_PER_DOMAIN } from '@engine/cognitive/items';
import {
  attachmentSummaryFromView,
  bigFiveSummaryFromScores,
  cognitiveSummaryFromResult,
  darkTriadSummaryFromScores,
  encodeShareCode,
  eqSummaryFromScores,
  jungianSummaryFromResult,
  type CognitiveSummaryV2,
} from '@/lib/shareCode';
import {
  attachmentViewFixture,
  bigFiveScoresWithTScore,
  cognitiveResultWithCorrectCounts,
  darkTriadScoresWithTScore,
  eqScoresFor,
  jungianResultFromZ,
} from '@/lib/__tests__/shareCode.fixtures';
import { setLocaleCookie } from './helpers';

/**
 * ShareBar가 아직 이 코드를 내보내지 않으므로(후속 작업), shareCode.ts의 실제
 * 인코더 + 기존 유닛 테스트 픽스처 빌더(jungianResultFromZ)를 그대로 재사용해
 * 유효한 jungian 공유 코드를 직접 만든다. 모든 축을 경계에서 멀리 떨어뜨려
 * (|z| 크게) 완결된 4글자 타입(ENFP)이 나오게 한다 — 경계 코드에는 삽화 PNG가
 * 없어 og:image 바이트 하한 검증이 무의미해진다.
 */
function buildConfidentJungianShareCode(): string {
  const result = jungianResultFromZ({
    extraversion: 1.4,
    intellect: 1.4,
    agreeableness: 1.4,
    conscientiousness: -1.4,
  });
  const summary = jungianSummaryFromResult(result, 'en');
  return encodeShareCode(summary);
}

test.describe('shared summary card (/s/[kind]/[code])', () => {
  test('renders a readable page and a rich og:image for a valid jungian share code', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    const code = buildConfidentJungianShareCode();

    const response = await page.goto(`/s/jungian/${code}`);
    expect(response?.ok()).toBe(true);

    // summary.locale은 "en"이므로, 뷰어 쿠키가 ko여도 본문은 영어로 렌더링돼야 한다.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ENFP');
    await expect(page.locator('.jungian-type-code')).toContainText('ENFP');

    const ogImageMeta = page.locator('meta[property="og:image"]');
    await expect(ogImageMeta).toHaveCount(1);
    const ogImageUrl = await ogImageMeta.getAttribute('content');
    expect(ogImageUrl).toBeTruthy();

    const imageResponse = await context.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');

    const body = await imageResponse.body();
    // 삽화 PNG가 실제로 실렸는지 확인하는 바이트 하한 — 삽화 없이 텍스트만 그린
    // 카드는 대략 20~30KB에 그친다.
    expect(body.byteLength).toBeGreaterThan(60_000);
  });

  test('returns a not-found page for a garbage share code', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');

    // next dev의 첫 컴파일 스트리밍 중에는 HTTP 상태가 200으로 뜰 때가 있어(문서화된
    // dev 전용 동작), 상태 코드 대신 notFound()가 실제로 렌더한 화면을 검증한다.
    await page.goto('/s/jungian/not-a-real-share-code');
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeVisible();
  });

  test('renders a readable page and a rich og:image for a valid bigfive share code', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    const summary = bigFiveSummaryFromScores(
      bigFiveScoresWithTScore({
        extraversion: 80,
        agreeableness: 40,
        conscientiousness: 55,
        emotionalStability: 35,
        intellect: 60,
      }),
      'en',
    );
    const code = encodeShareCode(summary);

    const response = await page.goto(`/s/bigfive/${code}`);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const ogImageMeta = page.locator('meta[property="og:image"]');
    const ogImageUrl = await ogImageMeta.getAttribute('content');
    expect(ogImageUrl).toBeTruthy();

    const imageResponse = await context.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');

    const body = await imageResponse.body();
    // 최고 요인 삽화 PNG가 실제로 실렸는지 확인하는 바이트 하한.
    expect(body.byteLength).toBeGreaterThan(60_000);
  });

  test('renders a readable page and a rich og:image for a valid darktriad share code', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    const summary = darkTriadSummaryFromScores(
      darkTriadScoresWithTScore({ machiavellianism: 70, narcissism: 45, psychopathy: 20 }),
      'en',
    );
    const code = encodeShareCode(summary);

    const response = await page.goto(`/s/darktriad/${code}`);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const ogImageMeta = page.locator('meta[property="og:image"]');
    const ogImageUrl = await ogImageMeta.getAttribute('content');
    expect(ogImageUrl).toBeTruthy();

    const imageResponse = await context.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');

    const body = await imageResponse.body();
    // 삽화 없이 막대·글자만 그린 카드의 현실적인 바이트 하한(텍스트만 그린 빈 카드보다는 커야 한다).
    expect(body.byteLength).toBeGreaterThan(15_000);
  });

  test('renders a readable page and a rich og:image for a valid attachment share code', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    const summary = attachmentSummaryFromView(attachmentViewFixture(4.2, 1.8, 'anxious'), 'ko');
    const code = encodeShareCode(summary);

    const response = await page.goto(`/s/attachment/${code}`);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const ogImageMeta = page.locator('meta[property="og:image"]');
    const ogImageUrl = await ogImageMeta.getAttribute('content');
    expect(ogImageUrl).toBeTruthy();

    const imageResponse = await context.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');

    const body = await imageResponse.body();
    expect(body.byteLength).toBeGreaterThan(15_000);
  });

  test('renders a readable page and a rich og:image for a valid eq share code', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    // 문항 번호로 응답을 흩뿌려 네 하위요인이 서로 다른 값을 갖게 한다 — 모두 같은 값이면
    // 필드 자리 바뀜을 카드 그림만 보고는 알아챌 수 없다.
    const summary = eqSummaryFromScores(eqScoresFor((itemId) => ((itemId % 5) + 1) as 1 | 2 | 3 | 4 | 5), 'en');
    const code = encodeShareCode(summary);

    const response = await page.goto(`/s/eq/${code}`);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // 총점(SSEIT의 1차 지표)이 원점수 그대로 살아 돌아왔는지 본문에서 확인한다.
    await expect(page.getByText(`Raw score ${summary.totalRawSum} / 165`)).toBeVisible();

    const ogImageMeta = page.locator('meta[property="og:image"]');
    const ogImageUrl = await ogImageMeta.getAttribute('content');
    expect(ogImageUrl).toBeTruthy();

    const imageResponse = await context.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');

    const body = await imageResponse.body();
    // 삽화 없이 활자·막대만 그린 카드의 현실적인 바이트 하한.
    expect(body.byteLength).toBeGreaterThan(15_000);
  });

  test('renders a readable page and an og:image with no IQ number for a valid cognitive share code', async ({
    page,
    context,
  }) => {
    await setLocaleCookie(context, 'en');
    // 영역마다 정답 수를 다르게 둬야 필드 자리가 뒤바뀌었을 때 카드에서 눈에 띈다.
    const summary = cognitiveSummaryFromResult(
      cognitiveResultWithCorrectCounts({
        letterNumberSeries: 3,
        matrixReasoning: 2,
        verbalReasoning: 4,
        threeDimensionalRotation: 1,
      }),
      'en',
    );
    const code = encodeShareCode(summary);

    const response = await page.goto(`/s/cognitive/${code}`);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // 3+2+4+1 = 10문항 정답 → 62.5% → 화면에는 반올림한 63%.
    await expect(page.getByText('10 of 16 items correct · 63% overall accuracy')).toBeVisible();
    await expect(page.getByText(`3 / ${COGNITIVE_ITEMS_PER_DOMAIN}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`1 / ${COGNITIVE_ITEMS_PER_DOMAIN}`, { exact: true })).toBeVisible();

    // 규준 표본이 없는 검사라 백분위·IQ 환산치가 본문에 나타나면 안 된다.
    const bodyText = (await page.locator('body').innerText()).toLowerCase();
    expect(bodyText).not.toMatch(/iq\s*[:=]?\s*\d/);
    expect(bodyText).not.toMatch(/\d+(?:st|nd|rd|th)\s+percentile/);

    const ogImageMeta = page.locator('meta[property="og:image"]');
    const ogImageUrl = await ogImageMeta.getAttribute('content');
    expect(ogImageUrl).toBeTruthy();

    const imageResponse = await context.request.get(ogImageUrl!);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');

    const body = await imageResponse.body();
    // 삽화 없이 활자·막대만 그린 카드의 현실적인 바이트 하한.
    expect(body.byteLength).toBeGreaterThan(15_000);
  });

  test('does not publish a legacy cognitive estimate share code', async ({ page, context }) => {
    const legacyEstimate: CognitiveSummaryV2 = {
      kind: 'cognitive',
      version: 2,
      locale: 'en',
      domains: [
        { domain: 'gf', accuracy0to100: 75 },
        { domain: 'gc', accuracy0to100: 50 },
        { domain: 'gv', accuracy0to100: 25 },
        { domain: 'gwm', accuracy0to100: 50 },
        { domain: 'gs', accuracy0to100: 25 },
      ],
      iq: 123,
      confidenceInterval95: [118, 128],
    };
    const code = encodeShareCode(legacyEstimate);

    await page.goto(`/s/cognitive/${code}`);
    await expect(page.getByRole('heading', { name: /페이지를 찾을 수 없습니다|Page not found/i })).toBeVisible();
    expect((await page.locator('body').innerText())).not.toContain('123');
    const ogResponse = await context.request.get(`/s/cognitive/${code}/opengraph-image`);
    expect(ogResponse.status()).toBe(200);
    expect(ogResponse.headers()['content-type']).toContain('image/png');
  });
});
