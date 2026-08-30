import { expect, test } from "@playwright/test";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

test("attachment is visibly experimental", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/attachment");
  await dismissConsentBanner(page);

  await expect(page.locator('[data-evidence-status="experimental"]').first()).toBeVisible();
  await expect(page.locator('[data-evidence-status="validated-target-population"]')).toHaveCount(0);
});

test("MBTI route identifies the result as an unofficial derived analysis", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/psychometrics/types");
  await dismissConsentBanner(page);

  await expect(page.getByText("MBTI 유형 분석", { exact: false }).first()).toBeVisible();
  await expect(page.locator('[data-evidence-status="derived"]').first()).toBeVisible();
});

test("compatibility result keeps the shared derived label neutral, not MBTI-specific", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/compatibility");
  await dismissConsentBanner(page);

  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill("1990-05-15");
  await dateInputs.nth(1).fill("1992-11-08");
  await page.getByRole("button", { name: "두 프로필 비교하기" }).click();
  await page.waitForURL(/\/compatibility\/[^/]+\/[^/]+$/);
  await dismissConsentBanner(page);

  const badge = page.locator('[data-evidence-status="derived"]').first();
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText("기존 점수의 파생 요약");
  await expect(badge).not.toContainText("MBTI");
});
