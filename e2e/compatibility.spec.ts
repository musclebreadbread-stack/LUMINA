import { expect, test } from "@playwright/test";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

test.describe("Saju compatibility", () => {
  test("submits two profiles and renders a reproducible comparison", async ({ page, context }) => {
    await setLocaleCookie(context, "en");
    await page.goto("/compatibility");
    await dismissConsentBanner(page);

    await expect(page.getByRole("heading", { level: 1, name: "Compare two profiles" })).toBeVisible();
    await expect(page.locator('img[alt="An illustration of two Saju charts and flowing Five Element currents"]')).toBeVisible();
    await expect(page.locator('img[alt*="relationship current"]')).toHaveCount(4);
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
    await dateInputs.nth(0).fill("1990-05-15");
    await dateInputs.nth(1).fill("1992-11-08");

    await page.getByRole("button", { name: "Compare profiles" }).click();
    await page.waitForURL(/\/compatibility\/[^/]+\/[^/]+$/);
    await dismissConsentBanner(page);

    await expect(page.getByRole("heading", { level: 1, name: "Two charts, several ways to meet" })).toBeVisible();
    await expect(page.locator('img[alt="An illustration of two Saju currents meeting"]')).toBeVisible();
    await expect(page.locator('img[alt^="Symbolic zodiac illustration for"]')).toHaveCount(2);
    await expect(page.locator('img[alt*="relationship current"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
    await expect(page.getByTestId("compatibility-signal-balance")).toBeVisible();
    await expect(page.getByTestId("compatibility-relation-matrix")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Branch relations" })).toBeVisible();
    await expect(page.getByText("The two charts show", { exact: false })).toBeVisible();
  });
});
