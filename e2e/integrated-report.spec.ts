import { expect, test, type Page } from "@playwright/test";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

const BIG_FIVE_RESULT_CODE = "1".repeat(50);

type FixtureLane = "scientific" | "cultural";

interface PortraitFixture {
  readonly id: string;
  readonly sourceAssessmentId: string;
  readonly analysisKey: "psychometrics" | "darktriad" | "saju";
  readonly provenanceGroup: string;
  readonly lane: FixtureLane;
  readonly instrumentVersion: string;
  readonly scoringModelVersion: string;
  readonly constructId: string;
  readonly value: { readonly kind: "band"; readonly band: "mid" } | { readonly kind: "category"; readonly code: "fire" };
  readonly referenceIds: readonly string[];
}

function fixture(
  id: string,
  analysisKey: PortraitFixture["analysisKey"],
  constructId: string,
): PortraitFixture {
  if (analysisKey === "psychometrics") {
    return {
      id,
      sourceAssessmentId: "00000000-0000-4000-8000-000000000301",
      analysisKey,
      provenanceGroup: "ipip-50-v1",
      lane: "scientific",
      instrumentVersion: "IPIP-50/Goldberg-1992",
      scoringModelVersion: "big-five-derived-v1",
      constructId,
      value: { kind: "band", band: "mid" },
      referenceIds: ["psychometrics"],
    };
  }
  if (analysisKey === "darktriad") {
    return {
      id,
      sourceAssessmentId: "00000000-0000-4000-8000-000000000302",
      analysisKey,
      provenanceGroup: "sd3-27-v1",
      lane: "scientific",
      instrumentVersion: "SD3-27/Jones-Paulhus-2014",
      scoringModelVersion: "dark-triad-derived-v1",
      constructId,
      value: { kind: "band", band: "mid" },
      referenceIds: ["darktriad"],
    };
  }
  return {
    id,
    sourceAssessmentId: "00000000-0000-4000-8000-000000000303",
    analysisKey,
    provenanceGroup: "saju-symbolic-v1",
    lane: "cultural",
    instrumentVersion: "lunar-javascript/1.7.7",
    scoringModelVersion: "saju-symbolic-v1",
    constructId,
    value: { kind: "category", code: "fire" },
    referenceIds: ["saju"],
  };
}

async function seedPortraitSnapshots(page: Page, fixtures: readonly PortraitFixture[]): Promise<void> {
  await page.goto("/integrated-report");
  await page.waitForSelector('[data-testid="integrated-report-state"]');
  await page.evaluate(async (rows) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("lumina-integrated-portrait-v1", 1);
      request.onerror = () => reject(request.error ?? new Error("database open failed"));
      request.onblocked = () => reject(new Error("database seed blocked"));
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("snapshots")) {
          const snapshots = database.createObjectStore("snapshots", { keyPath: "id" });
          snapshots.createIndex("analysisKey", "analysisKey", { unique: false });
          snapshots.createIndex("completedAt", "completedAt", { unique: false });
        }
        if (!database.objectStoreNames.contains("exclusions")) {
          database.createObjectStore("exclusions", { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        try {
          const database = request.result;
          const transaction = database.transaction(["snapshots", "exclusions"], "readwrite");
          transaction.objectStore("snapshots").clear();
          transaction.objectStore("exclusions").clear();
          for (const row of rows) {
            transaction.objectStore("snapshots").put({
              schemaVersion: 1,
              id: row.id,
              sourceAssessmentId: row.sourceAssessmentId,
              analysisKey: row.analysisKey,
              provenanceGroup: row.provenanceGroup,
              lane: row.lane,
              instrumentVersion: row.instrumentVersion,
              scoringModelVersion: row.scoringModelVersion,
              completedAt: "2026-08-29T00:00:00.000Z",
              locale: "ko",
              signals: [
                {
                  constructId: row.constructId,
                  value: row.value,
                  descriptorIds: ["fixture.signal"],
                  limitationIds: ["fixture.limitation"],
                },
              ],
              referenceIds: row.referenceIds,
            });
          }
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error ?? new Error("database seed failed"));
          transaction.onabort = () => reject(transaction.error ?? new Error("database seed aborted"));
        } catch (error) {
          reject(error instanceof Error ? error : new Error("database seed failed"));
        }
      };
    });
  }, fixtures);
  await page.reload();
}

async function answerBigFiveItem(page: Page, id: number): Promise<void> {
  const value = ((id - 1) % 5) + 1;
  await page.locator(`#item-${id}`).locator("label").nth(value - 1).click();
}

async function completeBigFive(page: Page): Promise<void> {
  await page.goto("/psychometrics");
  await dismissConsentBanner(page);
  for (let id = 1; id <= 50; id += 1) {
    await answerBigFiveItem(page, id);
    if (id < 50 && id % 10 === 0) {
      await page.locator("form nav button").last().click();
    }
  }
  await page.getByRole("button", { name: "결과 보기", exact: true }).click();
  await expect(page).toHaveURL(/\/psychometrics\/result\?r=[1-5]{50}$/);
  await dismissConsentBanner(page);
}

test.describe("integrated self portrait capture boundary", () => {
  test.use({ locale: "ko-KR" });

  test("does not create a portrait snapshot from a direct result URL", async ({ page }) => {
    await page.goto(`/psychometrics/result?r=${BIG_FIVE_RESULT_CODE}`);
    await page.goto("/integrated-report");

    await expect(page.getByTestId("integrated-report-count")).toHaveText("0");
  });

  test("falls back to a session-only explanation when IndexedDB is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
    });
    await page.goto("/integrated-report");

    await expect(page.getByTestId("integrated-report-state")).toHaveAttribute("data-state", "memory-only");
    await expect(page.getByTestId("integrated-persistence-warning")).toBeVisible();
  });

  test("records one safe snapshot after a completed scientific result", async ({ page }) => {
    test.setTimeout(60_000);
    await completeBigFive(page);
    await page.goto("/integrated-report");

    await expect(page.getByTestId("integrated-report-count")).toHaveText("1");
    await expect(page.locator("body")).not.toContainText("responses");
    await expect(page.locator("body")).not.toContainText(BIG_FIVE_RESULT_CODE);

    const storedSnapshotKeys = await page.evaluate(async () =>
      new Promise<readonly string[]>((resolve, reject) => {
        const request = indexedDB.open("lumina-integrated-portrait-v1", 1);
        request.onerror = () => reject(request.error ?? new Error("database open failed"));
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("snapshots", "readonly");
          const read = transaction.objectStore("snapshots").getAll();
          read.onsuccess = () => {
            database.close();
            const first = read.result[0] as Record<string, unknown> | undefined;
            resolve(first ? Object.keys(first).sort() : []);
          };
          read.onerror = () => {
            database.close();
            reject(read.error ?? new Error("snapshot read failed"));
          };
        };
      }),
    );
    expect(storedSnapshotKeys).toEqual([
      "analysisKey",
      "completedAt",
      "id",
      "instrumentVersion",
      "lane",
      "locale",
      "provenanceGroup",
      "referenceIds",
      "schemaVersion",
      "scoringModelVersion",
      "signals",
      "sourceAssessmentId",
    ]);
  });

  test("shows exact missing requirements while the portrait is locked", async ({ page }) => {
    await seedPortraitSnapshots(page, [
      fixture("00000000-0000-4000-8000-000000000311", "psychometrics", "bigfive.extraversion"),
      fixture("00000000-0000-4000-8000-000000000312", "saju", "saju.dominant-element"),
    ]);

    await expect(page.getByTestId("integrated-report-state")).toHaveAttribute("data-state", "locked");
    await expect(page.getByText("과학적 관점 1개 더 필요")).toBeVisible();
  });

  test("separates scientific and symbolic lanes after unlock", async ({ page }) => {
    await seedPortraitSnapshots(page, [
      fixture("00000000-0000-4000-8000-000000000321", "psychometrics", "bigfive.extraversion"),
      fixture("00000000-0000-4000-8000-000000000322", "darktriad", "darktriad.narcissism"),
      fixture("00000000-0000-4000-8000-000000000323", "saju", "saju.dominant-element"),
    ]);

    await expect(page.getByTestId("integrated-report-state")).toHaveAttribute("data-state", "unlocked");
    await expect(page.getByTestId("integrated-scientific-lane")).toContainText("과학적 관찰");
    await expect(page.getByTestId("integrated-cultural-lane")).toContainText("상징적 관점");
    await expect(page.getByTestId("integrated-character")).toBeVisible();
    await expect(page.getByTestId("integrated-evidence-composition")).toBeVisible();
  });

  test("uses a static character fallback when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedPortraitSnapshots(page, [
      fixture("00000000-0000-4000-8000-000000000331", "psychometrics", "bigfive.extraversion"),
      fixture("00000000-0000-4000-8000-000000000332", "darktriad", "darktriad.narcissism"),
      fixture("00000000-0000-4000-8000-000000000333", "saju", "saju.dominant-element"),
    ]);

    await expect(page.getByTestId("integrated-character")).toHaveAttribute("data-motion", "reduced");
  });

  test("supports result exclusion and full deletion", async ({ page }) => {
    await seedPortraitSnapshots(page, [
      fixture("00000000-0000-4000-8000-000000000341", "psychometrics", "bigfive.extraversion"),
      fixture("00000000-0000-4000-8000-000000000342", "darktriad", "darktriad.narcissism"),
      fixture("00000000-0000-4000-8000-000000000343", "saju", "saju.dominant-element"),
    ]);

    await page.getByRole("button", { name: "이 결과 제외" }).first().click();
    await expect(page.getByTestId("integrated-report-count")).toHaveText("2");
    await page.getByRole("button", { name: "전체 삭제" }).click();
    await page.getByRole("button", { name: "지우기" }).click();
    await expect(page.getByTestId("integrated-report-count")).toHaveText("0");
  });

  test("keeps the portrait readable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedPortraitSnapshots(page, [
      fixture("00000000-0000-4000-8000-000000000351", "psychometrics", "bigfive.extraversion"),
      fixture("00000000-0000-4000-8000-000000000352", "darktriad", "darktriad.narcissism"),
      fixture("00000000-0000-4000-8000-000000000353", "saju", "saju.dominant-element"),
    ]);

    await expect(page.getByRole("heading", { level: 1, name: "통합 자기초상" })).toBeVisible();
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
  });

  test("does not treat a withheld cognitive result as a portrait source", async ({ page }) => {
    await page.goto("/cognitive/result/withheld-fixture");
    await page.goto("/integrated-report");

    await expect(page.getByTestId("integrated-report-count")).toHaveText("0");
  });

  test("keeps the English route and title separate from the cultural all report", async ({ page, context }) => {
    await setLocaleCookie(context, "en");
    await page.goto("/en/integrated-report");

    await expect(page.getByRole("heading", { level: 1, name: "Integrated Self Portrait" })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/integrated-report$/);
  });
});
