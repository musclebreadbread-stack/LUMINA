import { expect, test } from '@playwright/test';
import { dismissConsentBanner } from './helpers';

/**
 * Regression for src/proxy.ts: crawlers (KakaoTalk, X link-preview bots) fetch
 * "/r/<data>/opengraph-image" directly and do not follow redirects for
 * og:image. That pathname has no file extension, so the proxy matcher does
 * not exclude it, and an Accept-Language: en header used to make the
 * implicit-locale branch issue a 307 to "/en/r/<data>/opengraph-image" —
 * breaking the preview card. The route must bypass that branch and respond
 * 200 directly, regardless of Accept-Language.
 */

const REPORT_URL_PATTERN = /\/r\/[^/?#]+$/;

test.describe('og-image proxy bypass', () => {
  // No lumina.locale cookie is ever set here — the point of this test is to
  // exercise the Accept-Language-driven implicit-locale branch in
  // src/proxy.ts, which only runs when no cookie is present. Pin the
  // navigation locale to Korean via the context option (not the cookie) so
  // the form flow below reliably shows Korean labels regardless of the
  // runner's OS locale.
  test.use({ locale: 'ko-KR' });

  test('responds 200 (not a redirect) when a crawler sends Accept-Language: en', async ({ page, context }) => {
    await page.goto('/');
    await dismissConsentBanner(page);

    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();
    await page.getByRole('button', { name: '사주 원국 보기' }).click();
    await page.waitForURL(REPORT_URL_PATTERN);

    const reportPath = new URL(page.url()).pathname;
    const ogImagePath = `${reportPath}/opengraph-image`;

    const response = await context.request.get(ogImagePath, {
      headers: { 'accept-language': 'en-US,en;q=0.9' },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['location']).toBeUndefined();
    expect(response.headers()['content-type']).toContain('image/png');
  });
});
