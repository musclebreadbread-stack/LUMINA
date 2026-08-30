import { expect, test, type Page } from "@playwright/test";
import { ECR_ITEMS } from "@engine/attachment/items";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

/**
 * Exploratory attachment survey (36 ECR-R-informed items).
 *
 * This form used to show one item per screen with auto-advance, and its options were hardcoded
 * Korean `<button>` labels — so this spec clicked a button literally named "3 보통이다" 36 times,
 * quietly encoding that i18n bug as the test contract. The form now uses the shared Likert DOM
 * contract (src/components/assessment/LikertItemList.tsx): a `<li id="item-{id}">` per item with
 * five `<label>` elements wrapping sr-only radios, and every string comes from next-intl.
 * Clicking the third label is the same "보통이다" answer, without depending on the wording.
 */

/** Answers every item with the neutral midpoint (Likert value 3). */
async function answerAllNeutral(page: Page): Promise<void> {
  for (const item of ECR_ITEMS) {
    await page.locator(`#item-${item.id}`).locator("label").nth(2).click();
  }
}

test("attachment results use an opaque browser session run", async ({ page, context }) => {
  test.setTimeout(60_000);
  await setLocaleCookie(context, "ko");
  await page.goto("/attachment");
  await dismissConsentBanner(page);

  await answerAllNeutral(page);

  await page.getByRole("button", { name: "결과 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/attachment\/result\?run=[a-zA-Z0-9_-]{16,100}$/);
  await expect(page).not.toHaveURL(/\?r=/);
  await expect(page.locator('[data-evidence-status="experimental"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "당신의 애착 유형", exact: true })).toBeVisible();
});

test("blocks submission inline — no native alert — until every item is answered", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await setLocaleCookie(context, "ko");

  // 네이티브 alert()이 다시 들어오면 이 핸들러가 잡아 테스트를 실패시킨다.
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  await page.goto("/attachment");
  await dismissConsentBanner(page);

  const lastItem = ECR_ITEMS[ECR_ITEMS.length - 1]!;
  for (const item of ECR_ITEMS) {
    if (item.id === lastItem.id) continue;
    await page.locator(`#item-${item.id}`).locator("label").nth(2).click();
  }

  await page.getByRole("button", { name: "결과 보기", exact: true }).click();

  await expect(page).toHaveURL(/\/attachment$/);
  const warning = page.getByText("1문항이 아직 비어 있습니다. 모두 응답해야 결과를 볼 수 있습니다.", {
    exact: true,
  });
  await expect(warning).toBeVisible();
  expect(dialogs).toEqual([]);

  await page.locator(`#item-${lastItem.id}`).locator("label").nth(2).click();
  await expect(warning).toHaveCount(0);

  await page.getByRole("button", { name: "결과 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/attachment\/result\?run=[a-zA-Z0-9_-]{16,100}$/);
});

test("shares a /s/attachment/<code> link that survives a fresh browser context, unlike the ?run= link", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(60_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await setLocaleCookie(context, "ko");
  await page.goto("/attachment");
  await dismissConsentBanner(page);

  await answerAllNeutral(page);

  await page.getByRole("button", { name: "결과 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/attachment\/result\?run=[a-zA-Z0-9_-]{16,100}$/);
  const runUrl = page.url();

  await page.getByRole("button", { name: "링크 복사", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/^\/s\/attachment\/[0-9A-Za-z_-]{10}$/);
  expect(copied).not.toContain("?run=");
  expect(copied).not.toContain("?r=");

  // 대조군: 원래 "?run=" 링크는 이 탭의 세션스토리지에만 의존하므로, 저장소를 전혀
  // 공유하지 않는 새 컨텍스트에서 열면 실제로 깨진다는 것부터 확인한다. 로케일 쿠키는
  // 세션스토리지와 무관하므로 함께 심어 두어도 "저장소 없음" 전제는 그대로 유지된다 —
  // 이걸 심지 않으면 Chromium 기본 Accept-Language가 en-US라 문구 검증이 로케일에
  // 따라 흔들린다.
  const deadLinkContext = await browser.newContext();
  await setLocaleCookie(deadLinkContext, "ko");
  const deadLinkPage = await deadLinkContext.newPage();
  await deadLinkPage.goto(runUrl);
  await expect(deadLinkPage.getByRole("heading", { name: "결과를 불러올 수 없습니다", exact: true })).toBeVisible();
  await deadLinkContext.close();

  // 반면 공유 코드 링크는 같은 저장소 없는 새 컨텍스트에서도 요약을 그대로 재현한다.
  const freshContext = await browser.newContext();
  await setLocaleCookie(freshContext, "ko");
  const freshPage = await freshContext.newPage();
  await freshPage.goto(copied);
  await expect(freshPage.getByRole("heading", { level: 1 })).toBeVisible();
  await freshContext.close();
});
