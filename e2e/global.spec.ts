import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

// 법무 문서는 검토된 한국어 원문만 게시하고, 비한국어 화면에는 원문 기준 안내를 붙인다.
const KOREAN_ORIGINAL_NOTICE = 'This document is provided in Korean. The Korean original is the governing text.';

test.describe('consent banner', () => {
  // These two tests intentionally do NOT call dismissConsentBanner — they test the
  // banner itself, so each needs a fresh browser context (no prior consent stored)
  // and the banner left visible until the assertions/click happen.

  test('shows Accept/Decline buttons and disappears on Decline', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');

    const banner = page.getByRole('region', { name: /consent|동의/i });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: /accept|동의/i })).toBeVisible();
    await expect(banner.getByRole('button', { name: /decline|거부/i })).toBeVisible();

    await banner.getByRole('button', { name: /decline|거부/i }).click();
    await expect(banner).not.toBeVisible();

    await context.close();
  });

  test('disappears on Accept', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');

    const banner = page.getByRole('region', { name: /consent|동의/i });
    await expect(banner).toBeVisible();

    await banner.getByRole('button', { name: /accept|동의/i }).click();
    await expect(banner).not.toBeVisible();

    await context.close();
  });
});

test.describe('interactive locale switch', () => {
  test('switching to English updates the page and persists across navigation', async ({ page, context }) => {
    // Pin the starting locale to Korean via cookie so the test is deterministic
    // regardless of the browser's Accept-Language header (the app falls back to
    // Accept-Language, then Korean, only when no cookie is set).
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('내 안의 여러 나를,');

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Explore the selves');

    // Navigate via a real link, not a direct goto, to prove the locale choice
    // survives navigation with the as-needed English URL prefix.
    // 본문 안내 링크와 푸터 사이트 링크에 같은 이름이 있으므로 로케일 접두사가 붙는 푸터 링크로 이동한다.
    await page.getByLabel('Site links').getByRole('link', { name: 'Privacy Policy', exact: true }).click();
    await dismissConsentBanner(page);

    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('개인정보처리방침');
    await expect(page.getByText(KOREAN_ORIGINAL_NOTICE)).toBeVisible();
  });
});

test.describe('privacy policy page', () => {
  test('an explicit /en prefix selects English even with a Korean cookie', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/en/privacy');
    await dismissConsentBanner(page);

    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeVisible();
  });

  test('renders the reviewed Korean policy with all 16 sections and the governing-text notice', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/privacy');
    await dismissConsentBanner(page);

    // Root layout applies a "%s · LUMINA" title template on top of the page's own title.
    await expect(page).toHaveTitle('개인정보처리방침 · LUMINA');
    await expect(page.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeVisible();
    await expect(page.getByText(KOREAN_ORIGINAL_NOTICE)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(16);

    for (const title of ['1. 처리하는 개인정보와 목적·보유 기간', '8. 개인정보 처리위탁과 국외 이전', '16. 방침의 변경과 문의']) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
  });
});

test.describe('terms of service page', () => {
  test('renders the reviewed Korean terms with all articles', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/terms');
    await dismissConsentBanner(page);

    // Root layout applies a "%s · LUMINA" title template on top of the page's own title.
    await expect(page).toHaveTitle('이용약관 · LUMINA');
    await expect(page.getByRole('heading', { level: 1, name: '이용약관' })).toBeVisible();
    await expect(page.getByText(KOREAN_ORIGINAL_NOTICE)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(17);

    for (const title of ['제1조 (목적)', '제9조 (청약철회와 환불)', '제15조 (준거법과 관할)', '사업자 정보']) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
  });
});

test.describe('refund and withdrawal page', () => {
  test('renders the reviewed Korean refund guide with all 9 sections', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/refund-policy');
    await dismissConsentBanner(page);

    await expect(page).toHaveTitle('환불 및 청약철회 안내 · LUMINA');
    await expect(page.getByRole('heading', { level: 1, name: '환불 및 청약철회 안내' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(9);
    await expect(page.getByRole('heading', { level: 2, name: '3. 콘텐츠 열람 전: 7일 이내 전액 환불' })).toBeVisible();
  });
});

test.describe('policy page cross-links', () => {
  test('privacy links to terms and terms links back to privacy', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');

    await page.goto('/privacy');
    await dismissConsentBanner(page);

    await page.getByRole('link', { name: 'View Terms of Service' }).click();
    await dismissConsentBanner(page);
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { level: 1, name: '이용약관' })).toBeVisible();

    await page.getByRole('link', { name: 'View Privacy Policy' }).click();
    await dismissConsentBanner(page);
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: '개인정보처리방침' })).toBeVisible();
  });
});
