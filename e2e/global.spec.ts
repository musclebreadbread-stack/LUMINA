import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

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
    await page.getByRole('link', { name: 'Privacy Policy', exact: true }).click();
    await dismissConsentBanner(page);

    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
  });
});

test.describe('privacy policy page', () => {
  test('an explicit /en prefix selects English even with a Korean cookie', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/en/privacy');
    await dismissConsentBanner(page);

    await expect(page).toHaveURL(/\/en\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  });

  test('renders English title and all 8 sections', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/privacy');
    await dismissConsentBanner(page);

    // Root layout applies a "%s · LUMINA" title template on top of the page's own title.
    await expect(page).toHaveTitle('Privacy Policy · LUMINA');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();

    const sectionTitles = [
      '1. There is no sign-up',
      '2. What you enter stays only in this browser',
      '3. How share links work',
      '4. Personality test (Big Five) responses',
      '5. Biometric data (palm prints, face images)',
      '6. Advertising and cookies',
      '7. Server access logs',
      '8. Contact',
    ];

    for (const title of sectionTitles) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
  });
});

test.describe('terms of service page', () => {
  test('renders English title and all 7 sections', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/terms');
    await dismissConsentBanner(page);

    // Root layout applies a "%s · LUMINA" title template on top of the page's own title.
    await expect(page).toHaveTitle('Terms of Service · LUMINA');
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();

    const sectionTitles = [
      '1. What this service is',
      '2. Not medical, legal, or financial advice',
      '3. Basis and limits of the calculations',
      '4. Use by minors',
      '5. A structure with no sign-up',
      '6. Disclaimer',
      '7. Changes to these terms',
    ];

    for (const title of sectionTitles) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
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
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible();

    await page.getByRole('link', { name: 'View Privacy Policy' }).click();
    await dismissConsentBanner(page);
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  });
});
