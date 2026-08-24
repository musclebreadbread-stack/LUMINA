import { expect, test } from "@playwright/test";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

test("attachment is visibly experimental", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/attachment");
  await dismissConsentBanner(page);

  await expect(page.locator('[data-evidence-status="experimental"]').first()).toBeVisible();
  await expect(page.locator('[data-evidence-status="validated-target-population"]')).toHaveCount(0);
});

test("Jungian route identifies the result as an unofficial derived lens", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/psychometrics/types");
  await dismissConsentBanner(page);

  await expect(page.getByText("융 유형 렌즈", { exact: false }).first()).toBeVisible();
  await expect(page.locator('[data-evidence-status="derived"]').first()).toBeVisible();
});
