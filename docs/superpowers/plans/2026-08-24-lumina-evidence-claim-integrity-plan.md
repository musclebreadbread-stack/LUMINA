# LUMINA Phase 0A 근거·주장 정합성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LUMINA의 분석별 근거 상태·참고문헌·고지문을 하나의 타입 안전한 카탈로그로 통합하고, 애착·다크 트라이어드·융 유형이 실제 검증 수준을 넘어서 주장하지 않도록 Phase 0A를 완성한다.

**Architecture:** `src/engine/shared/evidence.ts`가 분석 근거 메타데이터의 타입과 상태를 소유하고, `src/lib/analysisCatalog.ts`가 홈·만다라·참고문헌·결과 화면이 공유하는 분석 정의를 제공한다. 계산 엔진은 순수 함수로 유지하며, Server Component는 카탈로그와 번역을 읽고 `EvidenceStatusBadge`와 고지문을 렌더링한다. 이번 계획에서는 개인 입력을 URL에서 제거하는 실행 저장소와 RIASEC 신규 엔진을 다루지 않는다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5, next-intl 4, Tailwind CSS 4, Vitest, Playwright, pnpm 11.

**Spec:** [2026-08-24 LUMINA 신뢰도 우선 플랫폼 고도화 설계](../specs/2026-08-24-lumina-trust-first-platform-enhancement-design.md)

## Global Constraints

- 기존 `scientific | cultural | entertainment` 계층은 호환성을 위해 유지하되, 과학적 주장의 단일 근거로 사용하지 않는다.
- 모든 분석은 검증 상태·적용 모집단·버전·한계·참고문헌을 가진다.
- 애착의 가정된 정규분포 백분위는 사용자 결과에서 노출하지 않는다.
- 융 유형은 `융 유형 렌즈(비공식)`으로 표시하고 공식 MBTI 검사처럼 표현하지 않는다.
- 다크 트라이어드는 한국어 번역·요인구조가 한국 사용자에게 검증됐다고 표현하지 않는다.
- 모든 과학적 계층에도 비진단·적용 한계 고지를 표시한다.
- 신규 코드에 `any`, 비검증된 타입 단언, 클라이언트 번들용 비밀값을 추가하지 않는다.
- Server Component는 정적 설명·근거·고지를 담당하고, 이번 작업의 근거 뱃지는 서버에서 렌더링한다.
- Phase 0A에서는 Supabase, 마이그레이션, 원응답 서버 저장을 추가하지 않는다.
- 삭제, 원본 이미지 이동, 배포, `git push`, 외부 데이터 전송은 이 계획의 범위가 아니다.
- 각 작업은 독립 테스트와 커밋으로 끝낸다.

## Scope Boundary

이 계획은 다음 작업만 구현한다.

1. 근거 타입·분석 카탈로그·참고문헌 그룹의 단일 출처
2. 모든 계층의 고지문과 검증 상태 뱃지
3. 애착·다크 트라이어드·융 유형의 사용자 노출 문구 교정
4. 애착 가정 백분위의 결과 화면 제거
5. 홈·만다라·참고문헌 목록의 카탈로그 정합성
6. 타입·메시지·회귀 E2E 검증

다음 항목은 승인된 상위 설계에 남아 있지만 이 계획에 포함하지 않는다.

- 개인 입력·원응답의 URL 제거와 `sessionStorage` 기반 `AssessmentRunV1`
- 서버/클라이언트 결과 경계 재설계
- O*NET RIASEC 문항 라이선스·한국어 적응·파일럿
- 홈 목적군 재배치, 이미지 파생본, 모션·Core Web Vitals 개선
- Supabase 계정·RLS 동기화

---

### Task 1: 근거 타입과 분석 카탈로그 추가

**Files:**
- Create: `src/engine/shared/evidence.ts`
- Create: `src/lib/analysisCatalog.ts`
- Create: `src/engine/darktriad/citations.ts`
- Create: `src/engine/attachment/citations.ts`
- Modify: `src/lib/referenceCatalog.ts`
- Create: `src/engine/shared/__tests__/evidence.test.ts`
- Create: `src/lib/__tests__/analysisCatalog.test.ts`

**Interfaces:**
- Consumes: `EvidenceTier` from `src/engine/shared/tier.ts`, `Citation` from `src/engine/shared/citation.ts`, existing engine citation modules.
- Produces: `AnalysisKey`, `MethodCategory`, `ValidationStatus`, `LicenseStatus`, `EvidenceProfile`, `AnalysisDefinition`, `ANALYSIS_CATALOG`, `analysisDefinition(key)`.

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from "vitest";
import { ANALYSIS_CATALOG, analysisDefinition } from "@/lib/analysisCatalog";

describe("analysis evidence catalog", () => {
  it("contains every user-facing analysis exactly once", () => {
    const keys = ANALYSIS_CATALOG.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      "saju",
      "astro",
      "tarot",
      "numerology",
      "psychometrics",
      "jungian",
      "darktriad",
      "attachment",
      "horoscope",
      "compatibility",
    ]);
  });

  it("does not describe derived or unvalidated methods as target-population validated", () => {
    expect(analysisDefinition("jungian").evidence.validationStatus).toBe("derived");
    expect(analysisDefinition("attachment").evidence.validationStatus).toBe("experimental");
    expect(analysisDefinition("darktriad").evidence.validationStatus).toBe(
      "translation-not-validated",
    );
  });
});
```

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run: `pnpm test -- src/engine/shared/__tests__/evidence.test.ts src/lib/__tests__/analysisCatalog.test.ts`

Expected: FAIL because `evidence.ts` and `analysisCatalog.ts` do not exist yet.

- [ ] **Step 3: Add the shared evidence types**

Implement `src/engine/shared/evidence.ts` with frozen-data-compatible readonly types:

```ts
export type AnalysisKey =
  | "saju"
  | "astro"
  | "tarot"
  | "numerology"
  | "psychometrics"
  | "jungian"
  | "darktriad"
  | "attachment"
  | "horoscope"
  | "compatibility";

export type MethodCategory =
  | "psychometric"
  | "astronomical-calculation"
  | "traditional-symbolic"
  | "derived-exploratory";

export type ValidationStatus =
  | "validated-target-population"
  | "validated-other-population"
  | "translation-not-validated"
  | "derived"
  | "experimental";

export type LicenseStatus = "verified" | "permission-required" | "not-approved";

export interface EvidenceProfile {
  readonly methodCategory: MethodCategory;
  readonly validationStatus: ValidationStatus;
  readonly targetPopulation: string;
  readonly normSource: string | null;
  readonly instrumentVersion: string;
  readonly licenseStatus: LicenseStatus;
  readonly lastReviewed: string;
  readonly limitations: readonly string[];
  readonly referenceIds: readonly string[];
}

export interface AnalysisDefinition {
  readonly key: AnalysisKey;
  readonly href: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly purpose: "traditional" | "personality" | "career" | "daily";
  readonly tier: "scientific" | "cultural" | "entertainment";
  readonly evidence: EvidenceProfile;
  readonly durationMinutes: number;
  readonly itemCount: number | null;
  readonly showOnMandala: boolean;
}
```

Do not add a numeric evidence grade. The product must show status and scope, not imply that culturally different methods are linearly rankable.

- [ ] **Step 4: Add citation modules without inventing metadata**

Create `src/engine/darktriad/citations.ts` with the original SD3 paper and the Korean validation paper. Create `src/engine/attachment/citations.ts` with the official ECR-R item/scoring page and the Korean short-form validation paper. Every `Citation` must have non-empty authors, integer year, title, venue, and an `http` or `https` URL when available.

- [ ] **Step 5: Define and freeze `ANALYSIS_CATALOG`**

Create `src/lib/analysisCatalog.ts` with one entry for each `AnalysisKey`. Set the following statuses exactly:

```ts
const CATALOG_STATUS = {
  psychometrics: "validated-other-population",
  jungian: "derived",
  darktriad: "translation-not-validated",
  attachment: "experimental",
} as const;
```

Use `methodCategory: "psychometric"` for Big Five, dark-triad, and attachment; `"derived-exploratory"` for Jungian and compatibility; `"astronomical-calculation"` for astro; and `"traditional-symbolic"` for Saju, tarot, numerology, and horoscope. Set `referenceIds` to existing or newly added `ReferenceGroupKey` values, never to an unregistered string.

Export:

```ts
export const ANALYSIS_CATALOG: readonly AnalysisDefinition[];
export function analysisDefinition(key: AnalysisKey): AnalysisDefinition;
```

`analysisDefinition` must throw `RangeError` for an unknown key. Freeze the catalog and each entry, matching the existing engine convention.

- [ ] **Step 6: Extend the reference catalog and validate joins**

Add `darktriad`, `attachment`, and `compatibility` to `ReferenceGroupKey`. Use `SAJU_TRADITION_CITATIONS` for the compatibility group until a separate synastry source set is approved. Add tests that every `referenceIds` value resolves to one `REFERENCE_GROUPS` key and every citation passes `isValidCitation`.

- [ ] **Step 7: Run focused tests and commit**

Run: `pnpm test -- src/engine/shared/__tests__/evidence.test.ts src/lib/__tests__/analysisCatalog.test.ts src/engine/shared/__tests__/citation-explanation.test.ts`

Expected: PASS.

Commit:

```bash
git add src/engine/shared/evidence.ts src/lib/analysisCatalog.ts src/engine/darktriad/citations.ts src/engine/attachment/citations.ts src/lib/referenceCatalog.ts src/engine/shared/__tests__/evidence.test.ts src/lib/__tests__/analysisCatalog.test.ts
git commit -m "feat: add typed analysis evidence catalog"
```

### Task 2: Connect the catalog to home, mandala, and references

**Files:**
- Modify: `src/lib/mandalaModel.ts`
- Modify: `src/components/home/FeatureHub.tsx`
- Modify: `src/components/home/FeaturePortal.tsx`
- Modify: `src/components/home/SajuHubTrigger.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/references/page.tsx`
- Modify: `src/lib/__tests__/mandalaModel.test.ts`
- Create: `src/lib/__tests__/analysisCatalogParity.test.ts`

**Interfaces:**
- Consumes: `ANALYSIS_CATALOG`, `analysisDefinition`, `AnalysisDefinition` from Task 1.
- Produces: Home and reference views that cannot silently omit an analysis or use a stale tier.

- [ ] **Step 1: Write parity tests before changing consumers**

```ts
import { describe, expect, it } from "vitest";
import { ANALYSIS_CATALOG } from "@/lib/analysisCatalog";
import { MANDALA_FEATURES } from "@/lib/mandalaModel";
import { REFERENCE_GROUPS } from "@/lib/referenceCatalog";

describe("analysis catalog consumers", () => {
  it("has a reference group for every catalog entry", () => {
    const groups = new Set(REFERENCE_GROUPS.map((group) => group.key));
    for (const definition of ANALYSIS_CATALOG) {
      for (const referenceId of definition.evidence.referenceIds) {
        expect(groups.has(referenceId)).toBe(true);
      }
    }
  });

  it("does not expose a mandala node with a stale tier", () => {
    for (const node of MANDALA_FEATURES) {
      expect(node.tier).toBe(ANALYSIS_CATALOG.find((item) => item.key === node.key)?.tier);
    }
  });
});
```

- [ ] **Step 2: Run the parity tests and record the current omissions**

Run: `pnpm test -- src/lib/__tests__/analysisCatalogParity.test.ts src/lib/__tests__/mandalaModel.test.ts`

Expected: FAIL before the consumers read the new catalog because the existing compatibility card and reference groups are independently hard-coded.

- [ ] **Step 3: Make mandala visual data consume catalog metadata**

Keep `planetKey`, `textureSrc`, `orbitInset`, and image paths in `MANDALA_FEATURES`, but derive `titleKey`, `descKey`, `href`, and `tier` from `analysisDefinition`. Keep the eight-node astronomical presentation unchanged; `compatibility` remains catalog-only with `showOnMandala: false`.

- [ ] **Step 4: Make FeatureHub render catalog metadata**

Replace the separately hard-coded compatibility `FeaturePortal` props with `analysisDefinition("compatibility")`. Pass the definition's `tier` and evidence status props into `FeaturePortal` and `SajuHubTrigger`. Do not add a new client boundary; `FeatureHub` remains an async Server Component.

- [ ] **Step 5: Replace the home report group list with catalog keys**

In `src/app/page.tsx`, replace the `REPORT_GROUPS` entries that duplicate method keys with a typed list of `AnalysisKey` values and resolve titles/descriptions through `analysisDefinition`. Preserve the existing progressive disclosure behavior: the Saju form remains hidden until the Saju card is activated.

- [ ] **Step 6: Make the references page render registered groups**

Remove the parallel `TITLE_KEYS` map where the catalog already supplies a title key. Render the new dark-triad, attachment, and compatibility groups in stable catalog order. Keep citation rendering in `CitationList` and do not add client state.

- [ ] **Step 7: Run UI/model tests and commit**

Run: `pnpm test -- src/lib/__tests__/analysisCatalogParity.test.ts src/lib/__tests__/mandalaModel.test.ts src/i18n/__tests__/messages.test.ts`

Expected: PASS.

Commit:

```bash
git add src/lib/mandalaModel.ts src/components/home/FeatureHub.tsx src/components/home/FeaturePortal.tsx src/components/home/SajuHubTrigger.tsx src/app/page.tsx src/app/references/page.tsx src/lib/__tests__/mandalaModel.test.ts src/lib/__tests__/analysisCatalogParity.test.ts
git commit -m "refactor: drive discovery surfaces from analysis catalog"
```

### Task 3: Make disclaimer behavior and evidence status explicit

**Files:**
- Modify: `src/engine/shared/tier.ts`
- Modify: `src/components/ui/Chrome.tsx`
- Modify: `src/components/ui/ResultCover.tsx`
- Create: `src/components/ui/EvidenceStatusBadge.tsx`
- Modify: `src/engine/shared/__tests__/tier.test.ts`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: `EvidenceProfile`, `ValidationStatus` from Task 1 and existing `EvidenceTier`.
- Produces: `requiresDisclaimer(tier)`, `EvidenceStatusBadge`, and generic scientific/cultural/entertainment disclaimer text. `ResultCover` accepts an optional `evidenceStatus`; when supplied, it renders the status badge instead of a scientific tier badge so experimental or derived methods cannot inherit an unsupported claim from the shared result shell.

- [ ] **Step 1: Update the failing tier tests**

Change the existing expectation so all tiers require a disclaimer and add a test that every status has a translation key:

```ts
it("requires a limitation notice for every tier", () => {
  expect(requiresDisclaimer("scientific")).toBe(true);
  expect(requiresDisclaimer("cultural")).toBe(true);
  expect(requiresDisclaimer("entertainment")).toBe(true);
});
```

Run: `pnpm test -- src/engine/shared/__tests__/tier.test.ts`

Expected: FAIL until the tier function and translation keys change.

- [ ] **Step 2: Fix `TIER_META` and `Disclaimer` without changing the public tier union**

Keep `EvidenceTier` unchanged for route compatibility. Set `requiresDisclaimer` to return `true` for all three values. Keep a non-null `disclaimerKey` for every `TIER_META` entry. Update `Disclaimer` so the scientific copy describes measurement limits and non-diagnosis generally; it must not mention IPIP-50 because the component is shared by dark-triad, attachment, and future psychometric methods.

- [ ] **Step 3: Add `EvidenceStatusBadge` as a Server Component**

Create:

```tsx
export async function EvidenceStatusBadge({
  status,
  tone = "dark",
}: {
  readonly status: ValidationStatus;
  readonly tone?: "dark" | "light";
}) {
  // Resolve common.evidenceStatus.<status> with getTranslations("common").
  // Emit data-evidence-status={status} for stable E2E assertions.
}
```

Use a fixed status-to-key map typed as `Record<ValidationStatus, string>`. Do not construct arbitrary translation paths from user input.

- [ ] **Step 4: Make shared result covers status-aware**

Extend `ResultCover` with an optional `evidenceStatus?: ValidationStatus`. Preserve the existing tier badge for legacy callers that do not pass a status. When a status is supplied, render `EvidenceStatusBadge` in the same metadata area and omit `TierBadge`; method result routes in Task 4 must pass their catalog status explicitly.

- [ ] **Step 5: Add matching ko/en message keys**

Add `common.evidenceStatus` keys for `validated-target-population`, `validated-other-population`, `translation-not-validated`, `derived`, and `experimental`. Replace the scientific disclaimer with a generic non-diagnostic and population-scope notice. Keep placeholder names identical between `messages/ko.json` and `messages/en.json`.

- [ ] **Step 6: Run tier and i18n tests**

Run: `pnpm test -- src/engine/shared/__tests__/tier.test.ts src/i18n/__tests__/messages.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the shared evidence UI**

```bash
git add src/engine/shared/tier.ts src/components/ui/Chrome.tsx src/components/ui/ResultCover.tsx src/components/ui/EvidenceStatusBadge.tsx src/engine/shared/__tests__/tier.test.ts messages/ko.json messages/en.json
git commit -m "feat: show evidence status and limits for every tier"
```

### Task 4: Correct method claims and remove unsupported attachment percentiles

**Files:**
- Modify: `src/lib/attachmentModel.ts`
- Modify: `src/components/attachment/AxisBar.tsx`
- Modify: `src/engine/attachment/scoring.ts`
- Modify: `src/engine/attachment/items.ts`
- Modify: `src/engine/attachment/__tests__/scoring.test.ts`
- Modify: `src/app/attachment/page.tsx`
- Modify: `src/app/attachment/result/page.tsx`
- Modify: `src/app/darktriad/page.tsx`
- Modify: `src/app/darktriad/result/page.tsx`
- Modify: `src/app/psychometrics/page.tsx`
- Modify: `src/app/psychometrics/result/page.tsx`
- Modify: `src/app/psychometrics/types/page.tsx`
- Modify: `src/app/psychometrics/types/result/page.tsx`
- Modify: `src/lib/darktriadModel.ts`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Create: `src/lib/__tests__/attachmentModel.test.ts`

**Interfaces:**
- Consumes: `analysisDefinition`, `EvidenceStatusBadge`, and `Disclaimer` from Tasks 1–3.
- Produces: method pages and result pages whose labels match their actual validation state; `AttachmentView` no longer exposes a generated percentile.

- [ ] **Step 1: Write the attachment regression test**

```ts
import { describe, expect, it } from "vitest";
import { buildAttachmentView } from "@/lib/attachmentModel";

describe("attachment view", () => {
  it("returns continuous axes without an empirical percentile", () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, index) => [index + 1, 3]),
    ) as Record<number, 1 | 2 | 3 | 4 | 5>;
    const view = buildAttachmentView(responses);
    expect(view.anxiety.mean).toBe(3);
    expect(view.avoidance.mean).toBe(3);
    expect("percentile" in view.anxiety).toBe(false);
  });
});
```

Run: `pnpm test -- src/lib/__tests__/attachmentModel.test.ts`

Expected: FAIL because `AxisView` currently adds a generated percentile.

- [ ] **Step 2: Remove percentile from the user-facing attachment model**

Remove the `getPercentile` import and `percentile` property from `AxisView` and `buildAttachmentView`, and remove the optional `percentile` field from `AxisScore` in `src/engine/attachment/scoring.ts`. Keep raw mean, raw sum, item count, and the existing quadrant classification. Do not delete `src/engine/attachment/norms.ts` or `src/engine/attachment/norms.json`; leave them isolated for the separately approved instrument-replacement work and add a module comment that they are not valid production norms for the current implementation.

- [ ] **Step 3: Update attachment visual copy**

Remove the percentile row from `AxisBar`. Keep the 1–5 continuous axis and label it as an exploratory score. Add `EvidenceStatusBadge status="experimental"` and the generic `Disclaimer` to the attachment result. Remove the `scientific` `TierBadge` from the attachment landing/result header so the page cannot display a conflicting scientific label.

- [ ] **Step 4: Correct the attachment text claims**

In both locale files, replace `ECR-R based` and `scientifically validated` claims with `ECR-R 관련 문항을 참고한 실험적 탐색` / `experimental exploratory measure informed by ECR-R`. State that the current Korean wording, scale, reverse-scoring, and norms are under review. Preserve the user-facing explanation of anxiety and avoidance as relationship dimensions without calling the output a diagnosis.

- [ ] **Step 5: Correct dark-triad and Jungian labels**

Use `EvidenceStatusBadge` in both dark-triad pages with `translation-not-validated`, and change copy to state that the Korean wording and factor structure are not validated for the target population. Keep the factor names as construct labels but remove wording that implies a clinical or moral diagnosis.

Replace every user-facing MBTI title, kicker, CTA, metadata title, and glossary definition in the psychometrics and Jungian pages/messages with `융 유형 렌즈(비공식)` / `Jungian Type Lens (unofficial)`. Keep the trademark notice but make the derived-from-Big-Five relationship primary. Use `EvidenceStatusBadge status="derived"` and keep the existing continuous axis result as the primary output.

- [ ] **Step 6: Preserve valid Big Five caveats**

Keep the Big Five result's statistical fields, but change its status presentation to `validated-other-population` and ensure its method note states that the public norms are not Korean population norms. Do not remove the existing SEM, CI, reliability, or retest comparison data.

- [ ] **Step 7: Run engine and model tests**

Run: `pnpm test -- src/lib/__tests__/attachmentModel.test.ts src/engine/attachment/__tests__/scoring.test.ts src/engine/psychometrics/__tests__/jungian.test.ts src/engine/psychometrics/__tests__/scoring.test.ts`

Expected: PASS, with no test asserting a user-visible attachment percentile.

- [ ] **Step 8: Commit the claim corrections**

```bash
git add src/lib/attachmentModel.ts src/components/attachment/AxisBar.tsx src/engine/attachment/scoring.ts src/engine/attachment/items.ts src/engine/attachment/__tests__/scoring.test.ts src/app/attachment/page.tsx src/app/attachment/result/page.tsx src/app/darktriad/page.tsx src/app/darktriad/result/page.tsx src/app/psychometrics/page.tsx src/app/psychometrics/result/page.tsx src/app/psychometrics/types/page.tsx src/app/psychometrics/types/result/page.tsx src/lib/darktriadModel.ts src/lib/__tests__/attachmentModel.test.ts messages/ko.json messages/en.json
git commit -m "fix: align analysis claims with validation status"
```

### Task 5: Add status coverage to references and browser regression tests

**Files:**
- Modify: `src/app/references/page.tsx`
- Modify: `src/lib/__tests__/analysisCatalogParity.test.ts`
- Modify: `src/i18n/__tests__/messages.test.ts`
- Modify: `e2e/jungian.spec.ts`
- Create: `e2e/evidence-status.spec.ts`
- Modify: `src/engine/README.md`

**Interfaces:**
- Consumes: all catalog and evidence UI contracts from Tasks 1–4.
- Produces: automated proof that public method labels, references, and status badges remain synchronized.

- [ ] **Step 1: Add a stable browser test for public statuses**

Create `e2e/evidence-status.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { dismissConsentBanner, setLocaleCookie } from "./helpers";

test("attachment is visibly experimental", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/attachment");
  await dismissConsentBanner(page);
  await expect(page.locator('[data-evidence-status="experimental"]')).toBeVisible();
  await expect(page.locator('[data-evidence-status="validated-target-population"]')).toHaveCount(0);
});

test("Jungian route identifies the result as an unofficial derived lens", async ({ page, context }) => {
  await setLocaleCookie(context, "ko");
  await page.goto("/psychometrics/types");
  await dismissConsentBanner(page);
  await expect(page.getByText("융 유형 렌즈", { exact: false })).toBeVisible();
  await expect(page.locator('[data-evidence-status="derived"]')).toBeVisible();
});
```

- [ ] **Step 2: Update the existing Jungian E2E assertions**

Replace the old MBTI CTA and heading strings with the new unofficial Jungian Type Lens strings. Keep the assertion that the trademark notice is visible. Add a check that the result page contains the derived status attribute.

- [ ] **Step 3: Strengthen catalog and message parity tests**

Add assertions that every catalog key appears in exactly one reference group and that each `ValidationStatus` has non-empty Korean and English strings. Keep the existing placeholder parity test unchanged; only add the new status paths.

- [ ] **Step 4: Update the engine README inventory**

Add `attachment`, `darktriad`, and `synastry/compatibility` to the engine directory inventory. Add a short “Evidence metadata” section pointing to `src/engine/shared/evidence.ts` and state that `scientific` is not a diagnosis or universal population claim.

- [ ] **Step 5: Run the full Phase 0A verification set**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e -- e2e/evidence-status.spec.ts e2e/jungian.spec.ts
```

Expected:

- TypeScript exits 0 with no new `any`.
- ESLint exits 0 with no new warning; existing warnings are either fixed or explicitly unchanged in the handoff.
- All Vitest files pass.
- Next build completes with the existing Next.js 16.3.1 configuration.
- Browser tests observe the new status attributes and no stale MBTI/attachment-scientific labels.

Before E2E, inspect for an active `next dev` process and `.next/dev/lock`. Do not kill a running process or remove the lock automatically; obtain operator confirmation if a clean dev server is required.

- [ ] **Step 6: Commit documentation and regression coverage**

```bash
git add src/app/references/page.tsx src/lib/__tests__/analysisCatalogParity.test.ts src/i18n/__tests__/messages.test.ts e2e/jungian.spec.ts e2e/evidence-status.spec.ts src/engine/README.md
git commit -m "test: lock evidence status and reference parity"
```

### Task 6: Final review and handoff checkpoint

**Files:**
- Review only: `docs/superpowers/specs/2026-08-24-lumina-trust-first-platform-enhancement-design.md`
- Review only: `docs/superpowers/plans/2026-08-24-lumina-evidence-claim-integrity-plan.md`
- Review only: all files changed by Tasks 1–5

**Interfaces:**
- Consumes: completed Phase 0A commits and verification output.
- Produces: a clean handoff stating what is corrected and what remains in the separate privacy/RIASEC plans.

- [ ] **Step 1: Inspect the final diff for scope violations**

Run: `git status --short; git diff HEAD~5..HEAD --stat; git diff --check HEAD~5..HEAD`

Confirm that no file outside the task file lists changed, no secret/token/PII was added, and no raw survey data was committed.

- [ ] **Step 2: Scan for stale public claims**

Run:

```bash
rg -n -i 'MBTI 유형 검사|MBTI Type Test|ECR-R based|ECR-R 기반|과학적 근거|scientific basis|percentile|백분위' src/app src/components messages
```

Review each match. Percentile references are allowed for Big Five where its population limitation is visible; attachment percentiles and official-MBTI claims must have zero user-facing matches.

- [ ] **Step 3: Record the remaining risks**

The handoff must explicitly state that Phase 0A does not yet remove personal inputs from URL paths/query strings, does not validate Korean psychometric instruments, and does not add RIASEC. These are not silently implied to be complete.

- [ ] **Step 4: Report the checkpoint**

Include the commit list, exact verification commands, changed file groups, and the next separate plan target. Do not push or deploy.

## Self-Review Checklist

- [ ] Every spec section relevant to Phase 0A maps to at least one task: evidence model (1), discovery parity (2), disclaimer behavior (3), existing-method claim correction (4), test/documentation gate (5–6).
- [ ] Privacy URL migration, RIASEC, UX, assets, and Supabase are explicitly scoped out instead of being implied as complete.
- [ ] All named types and functions are defined before a later task consumes them.
- [ ] Every step contains concrete file paths, signatures, commands, expected results, and does not rely on vague follow-up wording.
- [ ] All tests include a concrete path and expected result.
- [ ] No task deletes `src/engine/attachment/norms.ts` or `norms.json`; unsupported data is isolated without an irreversible file operation.
