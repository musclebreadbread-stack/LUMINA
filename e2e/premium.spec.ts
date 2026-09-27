import { expect, test } from '@playwright/test';
import { setLocaleCookie } from './helpers';

test('premium report landing presents free analysis before the long preview', async ({ page, context, baseURL }) => {
  await setLocaleCookie(context, 'ko', baseURL);
  await page.goto('/premium/saju-2027');

  const freeAnalysis = page.getByRole('link', { name: '기본 사주 분석 시작' });
  const chapterPreview = page.getByRole('heading', { name: '살펴볼 네 가지 주제' });

  await expect(freeAnalysis).toBeVisible();
  await expect(freeAnalysis).toHaveAttribute('href', '/saju');
  await expect(chapterPreview).toBeVisible();

  const [ctaBox, previewBox] = await Promise.all([
    freeAnalysis.boundingBox(),
    chapterPreview.boundingBox(),
  ]);

  if (!ctaBox || !previewBox) {
    throw new Error('The free analysis CTA or report preview heading is not visible.');
  }

  expect(ctaBox.y + ctaBox.height).toBeLessThan(previewBox.y);
});
