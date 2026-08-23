import { expect, test, type Page } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

/**
 * Tarot draw flow.
 *
 * Cards render inside `.card-flip-in` containers (see src/components/tarot/TarotCard.tsx) —
 * there's no other stable per-card hook, so that class (a real animation hook, not Tailwind
 * utility soup) is used to scope each card before drilling into role-based locators for its
 * name (h3 heading) and orientation badge (the span immediately after the heading).
 *
 * SpreadPicker selects the spread and navigates. The result page then asks for a position
 * before the reveal gate opens; this keeps the seeded card result fixed while making the
 * user's choice the visible ritual step.
 */

interface CardSnapshot {
  readonly name: string;
  readonly orientation: string;
}

async function readSpreadCards(page: Page, expectedCount: number): Promise<CardSnapshot[]> {
  const cards = page.locator('.card-flip-in');
  await expect(cards).toHaveCount(expectedCount);

  const snapshots: CardSnapshot[] = [];
  for (let i = 0; i < expectedCount; i += 1) {
    const card = cards.nth(i);

    const heading = card.getByRole('heading', { level: 3 });
    await expect(heading).toBeVisible();
    const name = (await heading.innerText()).trim();
    expect(name.length).toBeGreaterThan(0);

    // The orientation badge is the heading's next sibling <span> (triangle glyph + label,
    // e.g. "△︎Upright"). Text-search alone is ambiguous because the reading paragraph below
    // also contains the orientation word in a sentence, so we anchor on DOM structure instead.
    const badge = heading.locator('xpath=following-sibling::span[1]');
    await expect(badge).toBeVisible();
    const rawOrientation = await badge.innerText();
    const orientation = rawOrientation.replace(/[^\p{L}]/gu, '');
    expect(orientation).toMatch(/^(Upright|Reversed|정방향|역방향)$/);

    snapshots.push({ name, orientation });
  }
  return snapshots;
}

async function revealSpread(page: Page, choice: string): Promise<void> {
  await page.getByRole('button', { name: choice, exact: true }).click();
  const reveal = page.getByRole('button', { name: /카드 공개하기|Reveal the Cards/ });
  await expect(reveal).toBeEnabled();
  await reveal.click();
}

test.describe('Tarot draw flow', () => {
  // The /tarot route can take a while to compile on first hit in dev mode under load
  // (e.g. when other test workers/processes are compiling concurrently), so this file
  // uses a longer-than-default timeout budget rather than the global default.
  test.describe.configure({ timeout: 90_000 });

  // Locale resolution order (src/i18n/request.ts) is cookie -> Accept-Language header ->
  // Korean default. Playwright's Chromium context sends "en-US" by default, which would
  // win over the app's Korean default in the "no cookie" tests below. Pin the context
  // locale to Korean so those tests genuinely exercise the no-cookie default path instead
  // of accidentally falling back to English via Accept-Language negotiation.
  test.use({ locale: 'ko-KR' });

  test('shows the three spread options on the landing page (Korean default)', async ({ page }) => {
    await page.goto('/tarot', { timeout: 60_000 });
    await dismissConsentBanner(page);

    await expect(page.getByRole('button', { name: '한 장' })).toBeVisible();
    await expect(page.getByRole('button', { name: '세 장' })).toBeVisible();
    await expect(page.getByRole('button', { name: '켈틱 크로스' })).toBeVisible();
  });

  test('drawing a Three Cards spread renders 3 cards and reproduces identically from the seeded URL', async ({
    page,
  }) => {
    await page.goto('/tarot', { timeout: 60_000 });
    await dismissConsentBanner(page);

    await page.getByRole('button', { name: '세 장' }).click();
    await page.waitForURL(/\/tarot\/three\/[^/?#]+$/);
    await dismissConsentBanner(page);

    const seedMatch = page.url().match(/\/tarot\/three\/([^/?#]+)$/);
    expect(seedMatch).not.toBeNull();
    const seed = seedMatch![1];

    await revealSpread(page, '현재');
    const firstDraw = await readSpreadCards(page, 3);

    // Critical check: navigate directly to the exact same seeded URL with a *fresh* page.goto
    // (not the back button) and confirm the seeded shuffle reproduces the same cards, in the
    // same order, with the same orientations.
    await page.goto(`/tarot/three/${seed}`);
    await dismissConsentBanner(page);
    await revealSpread(page, '현재');
    const secondDraw = await readSpreadCards(page, 3);

    expect(secondDraw).toEqual(firstDraw);
  });

  test('drawing in English locale renders translated position label and orientation badge', async ({
    page,
    context,
  }) => {
    await setLocaleCookie(context, 'en');
    await page.goto('/tarot', { timeout: 60_000 });
    await dismissConsentBanner(page);

    await expect(page.getByRole('button', { name: 'One Card' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Three Cards' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Celtic Cross' })).toBeVisible();

    await page.getByRole('button', { name: 'One Card' }).click();
    await page.waitForURL(/\/tarot\/single\/[^/?#]+$/);
    await dismissConsentBanner(page);

    await revealSpread(page, 'Now');
    const cardsDrawn = await readSpreadCards(page, 1);
    expect(cardsDrawn).toHaveLength(1);
    const card = cardsDrawn[0]!;
    expect(card.orientation).toMatch(/^(Upright|Reversed)$/);

    // The "single" spread's only position is the engine's English label ("Now"), confirming
    // the position text itself is translated, not just the orientation badge.
    await expect(page.getByText('Now', { exact: true })).toBeVisible();
  });
});
