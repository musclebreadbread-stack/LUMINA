import { expect, test } from '@playwright/test';
import { dismissConsentBanner, setLocaleCookie } from './helpers';

test.describe('global BGM control', () => {
  test('is opt-in and loops the supplied track across exploration pages', async ({ page, context, baseURL }) => {
    await page.addInitScript(() => {
      window.name = '0';
      HTMLMediaElement.prototype.play = function countPlayback(): Promise<void> {
        window.name = String(Number(window.name) + 1);
        return Promise.resolve();
      };
    });

    await setLocaleCookie(context, 'ko', baseURL);
    await page.goto('/');
    await dismissConsentBanner(page);

    const control = page.getByTestId('bgm-toggle');
    await expect(control).toBeVisible();
    await expect(control).toHaveAttribute('aria-pressed', 'false');

    await control.click();
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('audio')).toHaveAttribute('src', '/audio/bgm/digital-observatory.mp3');
    await expect.poll(async () => page.evaluate(() => Number(window.name))).toBe(1);

    await page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.dispatchEvent(new Event('ended')));
    await expect.poll(async () => page.evaluate(() => Number(window.name))).toBe(2);
    await expect(page.locator('audio')).toHaveAttribute('src', '/audio/bgm/digital-observatory.mp3');

    await page.goto('/tarot');
    await dismissConsentBanner(page);
    await expect(page.getByTestId('bgm-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('audio')).toHaveAttribute('src', '/audio/bgm/digital-observatory.mp3');

    await page.goto('/psychometrics?to=types');
    await dismissConsentBanner(page);
    await expect(page.locator('audio')).toHaveAttribute('src', '/audio/bgm/digital-observatory.mp3');

    await page.getByTestId('bgm-toggle').click();
    await expect(page.getByTestId('bgm-toggle')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('audio')).not.toHaveAttribute('src');
  });

  test('keeps the floating control clear of the configuration header on desktop and mobile', async ({ page, context, baseURL }) => {
    await setLocaleCookie(context, 'ko', baseURL);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await dismissConsentBanner(page);

    const header = page.locator('main > header');
    const control = page.getByTestId('bgm-toggle');

    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const [headerBox, controlBox] = await Promise.all([
        header.boundingBox(),
        control.boundingBox(),
      ]);

      if (!headerBox || !controlBox) {
        throw new Error('The configuration header or floating BGM control is not visible.');
      }

      const overlaps = headerBox.x < controlBox.x + controlBox.width
        && headerBox.x + headerBox.width > controlBox.x
        && headerBox.y < controlBox.y + controlBox.height
        && headerBox.y + headerBox.height > controlBox.y;
      expect(overlaps, `BGM control overlaps the header at ${viewport.width}x${viewport.height}`)
        .toBe(false);
    }
  });

  test('offers a user-gesture retry when playback is blocked', async ({ page, context, baseURL }) => {
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

    await setLocaleCookie(context, 'ko', baseURL);
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
