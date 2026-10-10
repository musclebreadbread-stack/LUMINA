import { expect, test } from '@playwright/test';

import { dismissConsentBanner, setLocaleCookie } from './helpers';

test('cognitive pilot entry keeps the score release gate visible', async ({ page, context }) => {
  await setLocaleCookie(context, 'en');
  await page.goto('/cognitive');
  await dismissConsentBanner(page);

  await expect(page.getByText(/current.*pilot|pilot/i).first()).toBeVisible();
  await expect(page.getByText(/IQ|percentile/i).first()).toBeVisible();
  // 승인된 규준이 없는 동안: 완료 시 이론 분포 기반 추정치를 보여 주되, 표준화 점수는 승인 전까지 보류한다고 알린다.
  await expect(page.getByText(/theoretical assumption/i).first()).toBeVisible();
  await expect(page.getByText(/stay withheld until that norm/i).first()).toBeVisible();
});
