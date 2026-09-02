import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.describe('global BGM control', () => {
  test('is opt-in and follows the exploration area', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);

    const control = page.getByTestId('bgm-toggle');
    await expect(control).toBeVisible();
    await expect(control).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-bgm-area="home"]')).toBeVisible();

    await control.click();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => page.locator('audio').getAttribute('src')).toContain('/audio/bgm/home.mp3');

    await page.goto('/tarot');
    await dismissConsentBanner(page);
    await expect(page.locator('[data-bgm-area="tarot"]')).toBeVisible();
    await expect(page.getByTestId('bgm-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => page.locator('audio').getAttribute('src')).toContain('/audio/bgm/tarot.mp3');

    await page.getByTestId('bgm-toggle').click();
    await expect(page.getByTestId('bgm-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('audio')).not.toHaveAttribute('src');
  });

  test('offers a user-gesture retry when playback is blocked', async ({ page, context }) => {
    await page.addInitScript(() => {
      const originalPlay = HTMLMediaElement.prototype.play;
      let rejectFirstPlay = true;
      window.name = '0';
      HTMLMediaElement.prototype.play = function playWithBlockedFirstAttempt(this: HTMLMediaElement) {
        window.name = String(Number(window.name) + 1);
        if (rejectFirstPlay) {
          rejectFirstPlay = false;
          return Promise.reject(new DOMException('Playback was blocked', 'NotAllowedError'));
        }
        return originalPlay.call(this);
      };
    });

    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);

    const control = page.getByTestId('bgm-toggle');
    await control.click();
    await expect.poll(async () => page.evaluate(() => Number(window.name))).toBe(1);
    await expect(control).toHaveAttribute('aria-label', '배경음 재생 다시 시도');

    await control.click();
    await expect.poll(async () => page.evaluate(() => Number(window.name))).toBe(2);
  });
});
