import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { setLocaleCookie } from './helpers';

/**
 * 타로·오늘의 운세 결과 og:image 회귀 — 두 경로 모두 별도 공유 코드 없이
 * 경로 세그먼트만으로 그 자리에서 다시 계산한다(share-card.spec.ts의
 * /s/[kind]/[code] 흐름과 다른 대상이라 별도 파일로 둔다).
 *
 * 바이트 하한: 유효한 카드는 삽화 PNG를 최소 1장(오늘의 운세) ~ 최대 3장
 * (타로) 실어 보내 실측 시 170KB(타로 한 장)~430KB(오늘의 운세) 사이였다.
 * 깨진 링크의 무삽화 LUMINA 워드마크 카드는 약 20KB에 그치므로, 하한을 그
 * 사이 — 실측치의 절반 이하이면서 깨진 링크 카드보다는 확실히 큰 값으로
 * 잡아 "삽화가 실제로 실렸는지"를 구분한다.
 */

const TAROT_BYTE_FLOOR = 80_000;
const HOROSCOPE_BYTE_FLOOR = 150_000;

async function assertPngOgImage(page: Page, context: BrowserContext, byteFloor: number): Promise<void> {
  const ogImageMeta = page.locator('meta[property="og:image"]');
  await expect(ogImageMeta).toHaveCount(1);
  const ogImageUrl = await ogImageMeta.getAttribute('content');
  expect(ogImageUrl).toBeTruthy();

  const imageResponse = await context.request.get(ogImageUrl!);
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toContain('image/png');

  const body = await imageResponse.body();
  expect(body.byteLength).toBeGreaterThan(byteFloor);
}

test.describe('tarot result og:image', () => {
  for (const [spread, seed] of [
    ['single', 'content-og-sample-a'],
    ['three', 'content-og-sample-b'],
    ['celtic-cross', 'content-og-sample-c'],
  ] as const) {
    test(`renders a rich og:image for the ${spread} spread`, async ({ page, context }) => {
      await setLocaleCookie(context, 'ko');
      const response = await page.goto(`/tarot/${spread}/${seed}`);
      expect(response?.ok()).toBe(true);

      await assertPngOgImage(page, context, TAROT_BYTE_FLOOR);
    });
  }

  test('falls back to a branded card for an invalid spread key', async ({ context }) => {
    const imageResponse = await context.request.get(
      '/tarot/not-a-real-spread/content-og-sample-invalid/opengraph-image',
      { maxRedirects: 0 },
    );
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');
  });
});

test.describe('horoscope result og:image', () => {
  for (const [system, sign] of [
    ['zodiac', 'aries'],
    ['chinese', 'dragon'],
  ] as const) {
    test(`renders a rich og:image for ${system}/${sign}`, async ({ page, context }) => {
      await setLocaleCookie(context, 'en');
      const response = await page.goto(`/horoscope/${system}/${sign}`);
      expect(response?.ok()).toBe(true);

      await assertPngOgImage(page, context, HOROSCOPE_BYTE_FLOOR);
    });
  }

  test('falls back to a branded card for an invalid sign key', async ({ context }) => {
    const imageResponse = await context.request.get(
      '/horoscope/zodiac/not-a-real-sign/opengraph-image',
      { maxRedirects: 0 },
    );
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');
  });
});
