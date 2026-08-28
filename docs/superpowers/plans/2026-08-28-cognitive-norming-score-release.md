# 표준화 인지검사 규준화·점수 공개 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 파일럿 기반 위에서 한국 성인 18–64세 규준, IRT 보정, 공정성·타당도 증거, 승인된 규준 버전을 구축하고 그 기준을 통과한 실행에만 LUMINA 연구용 IQ 추정치와 신뢰구간을 공개한다.

**Architecture:** 이 계획은 전 계획의 파일럿 플랫폼과 분리된 연구·배포 단계다. 연구 데이터는 동의된 가명 데이터의 승인된 비공개 내보내기에서만 읽고, 통계 모델·규준 테이블·분석 로그는 버전 불변 산출물로 저장한다. 앱은 승인된 규준 버전을 서버에서만 읽어 결과 DTO로 필요한 점수·신뢰구간·백분위만 전달한다.

**Tech Stack:** 전 계획의 Next.js/Supabase/TypeScript 환경, 승인된 R 기반 심리측정 분석 환경(`renv`, `mirt`, `lavaan`, `psych`, `dplyr`, `readr`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-28-cognitive-standardized-iq-design.md`

## Global Constraints

- 이 계획은 파일럿 운영, 연구윤리·법률 검토, 참여자 동의, 비공개 연구 내보내기, 통계 책임자 승인이 완료된 후에만 시작한다.
- 수집 표본 수·연령/성별/학력/권역 층화 셀·DIF 분석력은 데이터 잠금 전에 시뮬레이션과 사전등록으로 확정한다. 임의의 표본 수 하나를 근거로 규준을 선언하지 않는다.
- 상용 IQ 검사의 문항·규준·상표를 복제하지 않는다. 외부 검사 수렴타당도 연구는 해당 도구의 라이선스와 전문가 시행 조건을 충족한다.
- 원자료, 참여자 가명 식별자, 보정 중 정답 키, 비공개 export URI, service_role 키를 Git·클라이언트·로그·공개 결과에 남기지 않는다.
- 결과 공개는 `approved` 규준 버전과 독립 심리측정 검토 기록이 동시에 있을 때만 허용한다. 검증 미통과 항목은 점수 공개가 아니라 보류·수정·재수집으로 처리한다.
- 연구 분석 스크립트는 원자료가 없는 합성 fixture로 단위 검증 가능해야 하며, 실데이터 실행은 별도 사람 승인을 받아야 한다.
- 마이그레이션 실행, 연구 export, 실제 분석, 외부 검사 시행, 점수 릴리스, 배포는 각 단계마다 별도 사람 승인이 필요하다.

---

## File Structure

| 경로 | 책임 |
| --- | --- |
| `research/cognitive/v1/analysis-plan.md` | 사전등록 가설·제외 기준·공개 게이트·분석 순서 |
| `research/cognitive/v1/data-dictionary.csv` | 가명 필드·허용값·민감도·보관 상태 정의 |
| `research/cognitive/v1/renv.lock` | R 분석 패키지 버전 고정 |
| `research/cognitive/v1/R/01-validate-export.R` | raw export를 분석용 최소 컬럼으로 검증·가명화 확인 |
| `research/cognitive/v1/R/02-fit-irt.R` | 2PL/3PL 비교, 문항 모수·적합도·정보량 산출 |
| `research/cognitive/v1/R/03-validate-structure.R` | 요인구조·국소의존·재검사·대안형 동등성 검증 |
| `research/cognitive/v1/R/04-fairness-dif.R` | 사전등록 집단의 DIF·폐기 후보·수정 이력 산출 |
| `research/cognitive/v1/R/05-build-norms.R` | 홀드아웃 검증된 연령 규준·백분위·신뢰구간 표 작성 |
| `research/cognitive/v1/R/06-release-gate.R` | 모든 통계·운영 기준을 기계 검증해 승인 후보 manifest 생성 |
| `research/cognitive/v1/tests/testthat/*.R` | 합성 fixture 기반 분석 유틸 회귀 테스트 |
| `src/server/cognitive/norms.ts` | 승인된 규준 manifest·테이블을 server-only로 읽는 DAL |
| `src/engine/cognitive-standardized/norming.ts` | theta·SEM을 IQ 척도·백분위·CI로 바꾸는 순수 함수 |
| `src/components/cognitive/StandardizedResult.tsx` | 점수·CI·백분위·한계를 함께 표시하는 결과 UI |
| `docs/assessment/cognitive-validation-report-template.md` | 공개 검증 보고서의 비식별 템플릿 |

## Shared Interfaces

```ts
import type { StandardizedScore } from "@engine/cognitive-standardized/types";

export interface ApprovedNormVersion {
  readonly id: string;
  readonly status: "approved";
  readonly targetPopulation: "ko-adults-18-64";
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
  readonly approvedAt: string;
}

export interface NormTable {
  readonly itemBankVersion: string;
  readonly algorithmVersion: string;
  readonly iqPointsPerTheta: number;
  readonly byAge: readonly AgeNormRow[];
}

export interface AgeNormRow {
  readonly minimumAge: number;
  readonly maximumAge: number;
  readonly thetaToIq: readonly number[];
  readonly iqToPercentile: readonly number[];
}
```

`StandardizedScore` is constructible only from a server-loaded `ApprovedNormVersion`, a completed run whose item-bank/algorithm versions match, and a score whose standardization eligibility is true.

### Task 1: 사전등록 가능한 분석 계약과 가명 데이터 사전을 작성한다

**Files:**
- Create: `research/cognitive/v1/analysis-plan.md`
- Create: `research/cognitive/v1/data-dictionary.csv`
- Create: `research/cognitive/v1/tests/fixtures/synthetic-responses.csv`
- Create: `research/cognitive/v1/tests/testthat/test-data-dictionary.R`

**Interfaces:**
- Produces: 동결된 분석 입력 계약과 실데이터 없는 합성 fixture.
- Consumes: 파일럿 item-bank/algorithm version, 동의 버전, Task 10의 운영 문서.

- [ ] **Step 1: 데이터 사전 완전성 실패 테스트를 작성한다.**

```r
test_that("every exported column has a sensitivity and retention class", {
  dictionary <- readr::read_csv("research/cognitive/v1/data-dictionary.csv", show_col_types = FALSE)
  expect_true(all(c("column_name", "allowed_values", "sensitivity", "retention_class") %in% names(dictionary)))
  expect_false(any(is.na(dictionary$sensitivity)))
  expect_false(any(is.na(dictionary$retention_class)))
})
```

- [ ] **Step 2: 테스트가 사전등록 파일 부재로 실패함을 확인한다.**

Run: `Rscript -e "testthat::test_dir('research/cognitive/v1/tests/testthat')"`

Expected: FAIL because the research directory and files do not exist.

- [ ] **Step 3: 분석 계획을 구체적으로 작성한다.**

The plan fixes: target population; consent and withdrawal handling; item exclusion rules; run-quality rules; 2PL versus 3PL comparison rule; factor-structure models; local-dependence checks; minimum individual-score precision; DIF groups and method; holdout split; retest/alternate-form design; external criterion protocol; and every pass/fail/publication decision. It states that changing any gate after data lock requires a versioned amendment and blocks release.

- [ ] **Step 4: 최소 데이터 사전과 합성 fixture를 작성한다.**

The dictionary allows only run version, item version, ordinal, submitted option, scored correctness, server event timestamps, consent version, age band, optional education band, optional region class, device eligibility class, and anonymized recontact/retest token. It forbids names, email, IP address, user-agent string, URL, and service credentials. The synthetic fixture contains no real participant values.

- [ ] **Step 5: testthat를 통과시키고 커밋한다.**

Run: `Rscript -e "testthat::test_dir('research/cognitive/v1/tests/testthat')"`

Expected: PASS.

```bash
git add research/cognitive/v1
git commit -m "docs: add cognitive norming analysis contract"
```

### Task 2: 승인된 연구 export 검증 파이프라인을 만든다

**Files:**
- Create: `research/cognitive/v1/R/01-validate-export.R`
- Create: `research/cognitive/v1/tests/testthat/test-validate-export.R`
- Create: `docs/assessment/cognitive-research-export-runbook.md`

**Interfaces:**
- Consumes: approved one-time private export path and Task 1 data dictionary.
- Produces: version-checked, column-reduced, analysis-ready parquet/CSV plus a non-sensitive validation manifest.

- [ ] **Step 1: 허용되지 않은 컬럼과 다른 버전 혼합을 거절하는 테스트를 작성한다.**

```r
test_that("validate_export rejects identifiers and mixed item-bank versions", {
  export <- fixture_export_with(c("email", "item_bank_version"), c("a@example.test", "mixed"))
  expect_error(validate_export(export, dictionary), "forbidden column|mixed item-bank version")
})
```

- [ ] **Step 2: 테스트가 validator 부재로 실패함을 확인한다.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-validate-export.R')"`

Expected: FAIL because `01-validate-export.R` does not exist.

- [ ] **Step 3: validator를 구현한다.**

`validate_export` rejects unapproved consent versions, forbidden columns, missing event ordering, duplicate answered assignments, non-active item versions, mixed item-bank/algorithm versions, and no qualifying holdout flag. It writes only row counts, version IDs, hash, timestamp, and validation result to the manifest; it never writes participant rows to logs.

- [ ] **Step 4: export runbook을 작성한다.**

Require two named approvals: data controller approval for a one-time private export and statistician approval for its analysis purpose. Include the human steps to verify withdrawal processing, grant time-limited access, run the validator in a restricted environment, store the manifest, and revoke access. Do not include a real URI, key, or export command with credentials.

- [ ] **Step 5: fixture tests pass and commit.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-validate-export.R')"`

Expected: PASS.

```bash
git add research/cognitive/v1/R/01-validate-export.R research/cognitive/v1/tests docs/assessment/cognitive-research-export-runbook.md
git commit -m "feat: validate cognitive research exports"
```

### Task 3: IRT 문항 보정과 정보량 검증을 자동화한다

**Files:**
- Create: `research/cognitive/v1/R/02-fit-irt.R`
- Create: `research/cognitive/v1/tests/testthat/test-fit-irt.R`
- Create: `research/cognitive/v1/R/lib-models.R`

**Interfaces:**
- Consumes: validated export from Task 2.
- Produces: item parameter table, model comparison, item-fit table, information curves, candidate calibration manifest.

- [ ] **Step 1: 문항 모수 범위와 미수렴을 차단하는 테스트를 작성한다.**

```r
test_that("validate_calibration rejects non-converged and impossible parameters", {
  bad <- tibble::tibble(item_id = "gf-01", converged = FALSE, a = -0.2, b = 0, c = 0.25)
  expect_error(validate_calibration(bad), "converged|discrimination")
})
```

- [ ] **Step 2: 테스트가 model helper 부재로 실패함을 확인한다.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-fit-irt.R')"`

Expected: FAIL because calibration helpers do not exist.

- [ ] **Step 3: 2PL/3PL 비교와 보정 함수를 구현한다.**

Use `mirt` to fit the preregistered candidate models on dichotomous items, preserve the exact package lock with `renv`, and select the model only by the frozen comparison rule. `validate_calibration` rejects non-convergence, nonpositive discrimination, difficulty outside the preregistered operational range, guessing outside the multiple-choice lower/upper bounds, low information, and failed item-fit criteria. It creates no score release by itself.

- [ ] **Step 4: 문항별 산출물을 비식별 manifest로 작성한다.**

Write model formula, package versions, convergence status, item version IDs, parameter values, fit decision, exposure status, and artifact hashes. Keep raw response matrices outside Git and outside the public artifact directory.

- [ ] **Step 5: 합성 fixture 테스트를 통과시키고 커밋한다.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-fit-irt.R')"`

Expected: PASS.

```bash
git add research/cognitive/v1/R/02-fit-irt.R research/cognitive/v1/R/lib-models.R research/cognitive/v1/tests
git commit -m "feat: add cognitive item calibration pipeline"
```

### Task 4: 구조·재검사·대안형 동등성 검증을 구현한다

**Files:**
- Create: `research/cognitive/v1/R/03-validate-structure.R`
- Create: `research/cognitive/v1/tests/testthat/test-validate-structure.R`
- Create: `research/cognitive/v1/R/lib-quality.R`

**Interfaces:**
- Consumes: Task 3 candidate calibration and preregistered holdout/retest markers.
- Produces: factor-model comparison, local-dependence report, conditional SE report, retest and alternate-form results.

- [ ] **Step 1: holdout leakage와 unqualified score precision을 거절하는 테스트를 작성한다.**

```r
test_that("release_precision rejects a score without holdout evidence", {
  expect_error(release_precision(tibble::tibble(split = "development", sem_iq = 4.8)), "holdout")
})
```

- [ ] **Step 2: 테스트가 quality helper 부재로 실패함을 확인한다.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-validate-structure.R')"`

Expected: FAIL because structure validation helpers do not exist.

- [ ] **Step 3: 계층 구조와 정밀도 분석을 구현한다.**

Fit the preregistered correlated-domain and hierarchical-general-factor models. Calculate local residual dependence, conditional SEM across theta, and holdout reproducibility. Produce subindex candidates only when their own model, precision, and form-equivalence criteria pass; do not infer a subindex from a total-score pass.

- [ ] **Step 4: 재검사와 대안형 동등성을 분석한다.**

Use only the preregistered recontact sample and interval. Report test–retest reliability, mean practice effect, confidence intervals, alternate-form score difference, and missingness. A detected material practice effect changes retest wording and score interpretation; it cannot be hidden by averaging scores.

- [ ] **Step 5: fixture tests pass and commit.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-validate-structure.R')"`

Expected: PASS.

```bash
git add research/cognitive/v1/R/03-validate-structure.R research/cognitive/v1/R/lib-quality.R research/cognitive/v1/tests
git commit -m "feat: validate cognitive structure and precision"
```

### Task 5: 공정성·DIF와 외부 준거 타당도를 검증한다

**Files:**
- Create: `research/cognitive/v1/R/04-fairness-dif.R`
- Create: `research/cognitive/v1/R/04b-external-validity.R`
- Create: `research/cognitive/v1/tests/testthat/test-fairness-dif.R`
- Create: `docs/assessment/cognitive-external-validity-protocol.md`

**Interfaces:**
- Consumes: Task 3 calibration, Task 4 holdout samples, preregistered group definitions.
- Produces: DIF decisions, differential test functioning results, external-criterion correlation and agreement report.

- [ ] **Step 1: group definition drift와 flagged item release를 막는 테스트를 작성한다.**

```r
test_that("build_release_items excludes unresolved DIF flags", {
  items <- tibble::tibble(item_id = c("gf-01", "gv-02"), dif_status = c("clear", "investigate"))
  expect_equal(build_release_items(items)$item_id, "gf-01")
})
```

- [ ] **Step 2: 테스트가 DIF module 부재로 실패함을 확인한다.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-fairness-dif.R')"`

Expected: FAIL because the fairness module does not exist.

- [ ] **Step 3: 사전등록 집단에 대한 DIF를 구현한다.**

Analyze the preregistered age, gender, education, region, and device-eligibility groups only where sample size meets the frozen analysis threshold. `build_release_items` excludes unresolved flags. Each excluded or revised item gets a versioned reason and requires recalibration after modification.

- [ ] **Step 4: 외부 준거 연구 프로토콜과 분석을 구현한다.**

The protocol requires a separately consented subsample, licensed administration of the chosen Korean adult cognitive assessment by qualified professionals, predeclared timing/order, blinded scoring, and no import of external raw reports into the product database. The analysis reports correlation, confidence interval, agreement/bias, and limitation; it never transforms LUMINA score into the external test's proprietary score.

- [ ] **Step 5: fairness fixture tests pass and commit.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-fairness-dif.R')"`

Expected: PASS.

```bash
git add research/cognitive/v1/R/04-fairness-dif.R research/cognitive/v1/R/04b-external-validity.R research/cognitive/v1/tests docs/assessment/cognitive-external-validity-protocol.md
git commit -m "feat: add cognitive fairness and validity analysis"
```

### Task 6: 연령 규준·IQ 척도·신뢰구간 테이블을 생성한다

**Files:**
- Create: `research/cognitive/v1/R/05-build-norms.R`
- Create: `research/cognitive/v1/tests/testthat/test-build-norms.R`
- Create: `src/engine/cognitive-standardized/norming.ts`
- Test: `src/engine/cognitive-standardized/__tests__/norming.test.ts`

**Interfaces:**
- Consumes: held-out validated theta/SEM and Task 5 release-item set.
- Produces: immutable age-norm table, `thetaToStandardizedScore`, `StandardizedScore`.

- [ ] **Step 1: norm table version mismatch와 불가능한 percentile을 거절하는 테스트를 작성한다.**

```ts
it("requires a matching approved norm version", () => {
  expect(() => thetaToStandardizedScore({ theta: 0, sem: 0.3, age: 32, itemBankVersion: "pilot-v1", algorithmVersion: "cat-v1" }, mismatchedNorm)).toThrow(
    "item bank version mismatch",
  );
});

it("keeps percentile within one through ninety-nine", () => {
  const score = thetaToStandardizedScore({ theta: 0, sem: 0.3, age: 32, itemBankVersion: "pilot-v1", algorithmVersion: "cat-v1" }, approvedFixtureNorm);
  expect(score.percentile).toBeGreaterThanOrEqual(1);
  expect(score.percentile).toBeLessThanOrEqual(99);
});
```

- [ ] **Step 2: 새 norming tests가 모듈 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/engine/cognitive-standardized/__tests__/norming.test.ts`

Expected: FAIL because `norming.ts` does not exist.

- [ ] **Step 3: holdout-validated 연령 규준 테이블을 만든다.**

`05-build-norms.R` uses only the frozen eligible sample and selected model. It creates smooth/stratified age norms exactly as preregistered, calculates the IQ scale with mean 100 and standard deviation 15, derives 95% confidence limits from individual SEM, and verifies the table on the held-out sample. Its manifest includes target population, item-bank version, algorithm version, sample version, analysis hash, and `candidate` status.

- [ ] **Step 4: 앱의 순수 norm conversion을 구현한다.**

```ts
export function thetaToStandardizedScore(
  input: Readonly<{ theta: number; sem: number; age: number; itemBankVersion: string; algorithmVersion: string }>,
  norm: ApprovedNormVersion & NormTable,
): StandardizedScore {
  assertNormCompatibility(input, norm);
  const fullScaleIq = lookupIq(input.theta, input.age, norm);
  const margin = Math.round(1.96 * input.sem * norm.iqPointsPerTheta);
  return Object.freeze({
    fullScaleIq,
    percentile: lookupPercentile(fullScaleIq, input.age, norm),
    confidenceInterval95: [fullScaleIq - margin, fullScaleIq + margin],
    normVersion: norm.id,
  });
}
```

The function accepts no client norm input and does not manufacture subindices.

- [ ] **Step 5: R/TypeScript fixture tests pass and commit.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-build-norms.R')"`

Run: `pnpm vitest run src/engine/cognitive-standardized/__tests__/norming.test.ts`

Expected: PASS.

```bash
git add research/cognitive/v1/R/05-build-norms.R research/cognitive/v1/tests src/engine/cognitive-standardized/norming.ts src/engine/cognitive-standardized/__tests__/norming.test.ts
git commit -m "feat: add versioned cognitive norm conversion"
```

### Task 7: 기계 검증 가능한 점수 공개 게이트와 승인 manifest를 만든다

**Files:**
- Create: `research/cognitive/v1/R/06-release-gate.R`
- Create: `research/cognitive/v1/tests/testthat/test-release-gate.R`
- Create: `research/cognitive/v1/release-manifest.schema.json`
- Create: `docs/assessment/cognitive-validation-report-template.md`

**Interfaces:**
- Consumes: Tasks 2–6 artifact manifests.
- Produces: `candidate` or `approved` release manifest; validation report data without raw participants.

- [ ] **Step 1: 하나의 실패 게이트가 release를 차단하는 테스트를 작성한다.**

```r
test_that("release gate rejects a candidate with unresolved DIF", {
  artifacts <- fixture_artifacts(dif_status = "investigate", external_validity = "pass")
  expect_equal(evaluate_release_gate(artifacts)$status, "blocked")
})
```

- [ ] **Step 2: 테스트가 release gate 부재로 실패함을 확인한다.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-release-gate.R')"`

Expected: FAIL because the gate script does not exist.

- [ ] **Step 3: 모든 공개 조건을 하나의 gate에 구현한다.**

`evaluate_release_gate` requires: valid export, converged selected IRT model, item fit, hierarchy/holdout evidence, conditional precision, retest/alternate-form evidence, resolved DIF, external criterion report, correct target population, exact version compatibility, and completed independent review. It emits `blocked` with reasons or `candidate` with hashes; no script can emit `approved`.

- [ ] **Step 4: 사람 승인과 공개 보고서 템플릿을 추가한다.**

The validation report template includes model evidence, norm sample description, precision, fairness/DIF actions, retest, external validity, limitations, and version IDs. A statistician and research owner sign an out-of-band approval record; only then may an authorized server-side process change candidate to `approved` in the private release registry.

- [ ] **Step 5: gate fixture tests pass and commit.**

Run: `Rscript -e "testthat::test_file('research/cognitive/v1/tests/testthat/test-release-gate.R')"`

Expected: PASS.

```bash
git add research/cognitive/v1/R/06-release-gate.R research/cognitive/v1/tests research/cognitive/v1/release-manifest.schema.json docs/assessment/cognitive-validation-report-template.md
git commit -m "feat: add cognitive score release gate"
```

### Task 8: 승인된 규준만 서버에서 읽어 결과 점수를 표시한다

**Files:**
- Create: `src/server/cognitive/norms.ts`
- Modify: `src/server/cognitive/repository.ts`
- Modify: `src/engine/cognitive-standardized/scoring.ts`
- Create: `src/components/cognitive/StandardizedResult.tsx`
- Modify: `src/app/cognitive/result/[runId]/page.tsx`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Test: `src/server/cognitive/__tests__/norms.test.ts`
- Test: `src/components/cognitive/__tests__/standardizedResult.dom.test.tsx`

**Interfaces:**
- Consumes: Task 6 `ApprovedNormVersion` and Task 7 approved release registry.
- Produces: owner-only standardized score result DTO and UI.

- [ ] **Step 1: candidate norm과 mismatch score를 숨기는 테스트를 작성한다.**

```ts
it("returns pilot withholding for a candidate norm", async () => {
  await expect(resolveScoreForRun(runWithCandidateNorm)).resolves.toEqual({ status: "pilot_withheld", score: null });
});
```

```tsx
render(<StandardizedResult score={fixtureScore} locale="ko" />);
expect(screen.getByText("전체 인지지수")).toBeVisible();
expect(screen.getByText("95% 신뢰구간")).toBeVisible();
expect(screen.getByText("임상 진단이나 선발 판단에 사용할 수 없습니다")).toBeVisible();
```

- [ ] **Step 2: 새 tests가 norm DAL/UI 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/server/cognitive/__tests__/norms.test.ts src/components/cognitive/__tests__/standardizedResult.dom.test.tsx`

Expected: FAIL because the approved norm reader and result component do not exist.

- [ ] **Step 3: `server-only` 규준 DAL을 구현한다.**

`norms.ts` reads only private release rows with status `approved`, verifies target population plus item-bank/algorithm compatibility with the completed run, and returns no table wider than the individual conversion needs. `resolveScoreForRun` falls back to `pilot_withheld` for candidate, expired, mismatched, or ineligible runs.

- [ ] **Step 4: 신뢰구간 우선 결과 UI를 구현한다.**

`StandardizedResult` renders the score, 95% CI, age-norm percentile, norm version, score date, retest/practice-effect notice, device standardization status, and non-clinical limitation. It renders no item answer, theta, raw score, participant demographic, rank list, or share URL. Korean and English copy use the same constraints.

- [ ] **Step 5: focused tests, full application tests, and commit.**

Run: `pnpm vitest run src/server/cognitive/__tests__/norms.test.ts src/components/cognitive/__tests__/standardizedResult.dom.test.tsx src/i18n/__tests__/messages.test.ts`

Run: `pnpm typecheck && pnpm lint && pnpm test`

Expected: PASS.

```bash
git add src/server/cognitive/norms.ts src/server/cognitive/repository.ts src/engine/cognitive-standardized/scoring.ts src/components/cognitive/StandardizedResult.tsx src/app/cognitive/result messages
git commit -m "feat: show approved standardized cognitive results"
```

### Task 9: 표준화 결과의 보안·접근성·회귀 검증과 점수 공개 승인을 수행한다

**Files:**
- Modify: `e2e/cognitive-standardized.spec.ts`
- Modify: `e2e/cognitive-security.spec.ts`
- Create: `e2e/cognitive-release-gate.spec.ts`
- Modify: `docs/assessment/cognitive-pilot-operations.md`
- Test: `e2e/cognitive-release-gate.spec.ts`

**Interfaces:**
- Consumes: Tasks 6–8.
- Produces: release evidence attached to the out-of-band approval record.

- [ ] **Step 1: approved/candidate/mismatched norm E2E를 작성한다.**

```ts
await seedRunWithNorm("approved-compatible");
await expect(page.getByText("전체 인지지수")).toBeVisible();
await expect(page.getByText("95% 신뢰구간")).toBeVisible();

await seedRunWithNorm("candidate");
await expect(page.getByText("연구 참여가 기록되었습니다")).toBeVisible();
await expect(page.getByText("전체 인지지수")).toHaveCount(0);
```

- [ ] **Step 2: 새 release E2E가 fixture/route 부재로 실패함을 확인한다.**

Run: `pnpm playwright test e2e/cognitive-release-gate.spec.ts --workers=1`

Expected: FAIL until approved private test fixtures and Task 8 result logic exist.

- [ ] **Step 3: 결과 보안과 접근성 assertions를 추가한다.**

Assert an owner sees only its own score; a different anonymous subject sees a recovery page; all result headings, CI labels, and limits are localized; no share button appears; and URL/DOM/script text lacks raw response, answer key, theta, seed, and service-role material.

- [ ] **Step 4: independent review package를 준비한다.**

Attach the approved release manifest, validation report, RLS test output, full automated test output, version hashes, and known limitations. The independent psychometric reviewer and research owner must approve before the server-side registry status changes to `approved` and before deployment.

- [ ] **Step 5: full verification passes and commit the non-sensitive test/docs changes.**

Run: `pnpm typecheck`

Run: `pnpm lint`

Run: `pnpm test`

Run: `pnpm playwright test e2e/cognitive-standardized.spec.ts e2e/cognitive-security.spec.ts e2e/cognitive-release-gate.spec.ts --workers=1`

Run: `pnpm build`

Expected: all commands PASS. Do not commit real exports, raw data, reviewer signatures, keys, or private registry rows.

```bash
git add e2e docs/assessment/cognitive-pilot-operations.md
git commit -m "test: verify cognitive score release gates"
```

## Phase-B Acceptance Criteria

- A versioned, preregistered analysis contract validates exports and preserves no raw participants in Git or logs.
- IRT, structural, precision, retest, alternate-form, DIF, holdout, and external-validity gates are all machine-evaluated and independently reviewed.
- An IQ-scale score exists only for a compatible completed run with a server-only `approved` norm version for Korean adults 18–64.
- Every released result includes 95% CI, percentile, norm version, standardization status, retest/practice-effect explanation, and non-clinical limits.
- A failed, candidate, mismatched, or ineligible condition displays the pilot-withheld result instead of a degraded or invented IQ value.
