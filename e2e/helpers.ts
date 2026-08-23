import type { BrowserContext, Page } from '@playwright/test';

/** Dismisses the fixed bottom-of-viewport ad consent banner if present, by clicking Accept/동의; no-ops silently otherwise. */
export async function dismissConsentBanner(page: Page): Promise<void> {
  const acceptButton = page.getByRole('button', { name: /accept|동의/i });
  const isVisible = await acceptButton.first().isVisible().catch(() => false);
  if (!isVisible) return;

  await acceptButton.first().click({ timeout: 5000 }).catch(() => {});
}

/** Seeds the "lumina.locale" cookie on a fresh browser context so pages load already in the given locale. */
export async function setLocaleCookie(context: BrowserContext, locale: 'ko' | 'en'): Promise<void> {
  await context.addCookies([
    { name: 'lumina.locale', value: locale, url: 'http://localhost:3000' },
  ]);
}
