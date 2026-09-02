import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.describe('character atlas', () => {
  test('shows all fifteen spirits without exposing a profile', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/characters');
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { level: 1, name: '나를 비추는 정령들' })).toBeVisible();
    await expect(page.getByTestId('character-card')).toHaveCount(15);
    await expect(page.getByText('아직 만나지 않은 정령').first()).toBeVisible();
    await expect(page.locator('[data-testid="character-card"] img')).toHaveCount(0);
  });

  test('reflects the browser-only unlocked collection', async ({ page, context }) => {
    await setLocaleCookie(context, 'en');
    await page.addInitScript(() => {
      window.localStorage.setItem('lumina.character-collection.v1', JSON.stringify(['wood-strong']));
    });
    await page.goto('/en/characters');
    await dismissConsentBanner(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Spirits that reflect a lens' })).toBeVisible();
    await expect(page.locator('[data-testid="character-card"][data-unlocked="true"]')).toHaveCount(1);
    await expect(page.getByText('Big Trunk')).toBeVisible();
    const unlockedArtwork = page.locator('[data-testid="character-card"][data-unlocked="true"] img');
    await expect(unlockedArtwork).toHaveCount(1);
    await expect.poll(async () => unlockedArtwork.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });
});
