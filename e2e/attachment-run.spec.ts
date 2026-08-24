import { expect, test } from "@playwright/test";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

test("attachment results use an opaque browser session run", async ({ page, context }) => {
  test.setTimeout(60_000);
  await setLocaleCookie(context, "ko");
  await page.goto("/attachment");
  await dismissConsentBanner(page);

  for (let index = 0; index < 36; index += 1) {
    await page.getByRole("button", { name: /^3\s+보통이다$/ }).click();
  }

  await page.getByRole("button", { name: "결과 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/attachment\/result\?run=[a-zA-Z0-9_-]{16,100}$/);
  await expect(page).not.toHaveURL(/\?r=/);
  await expect(page.locator('[data-evidence-status="experimental"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "당신의 애착 유형", exact: true })).toBeVisible();
});
