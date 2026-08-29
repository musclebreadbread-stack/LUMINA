# LUMINA 통합 자기초상 로컬 우선 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 완료한 여러 분석의 개인정보 없는 파생 요약을 브라우저에만 보관하고, 근거 수준과 출처를 분리한 결정론적 `통합 자기초상 / Integrated Self Portrait`을 `/integrated-report`에서 확인하게 한다.

**Architecture:** Server Component는 기존 결과를 계산한 뒤 원문 응답·출생 정보를 제외한 직렬화 가능한 스냅샷 초안만 Client Component에 전달한다. 작은 `IntegratedResultRecorder` Client Island가 실제 완료 표식을 소비했을 때만 IndexedDB 보관함에 안전한 스냅샷을 저장한다. 순수 도메인 모듈은 출처·비교·잠금·주장·캐릭터 recipe를 결정하고, `/integrated-report`의 Server Component는 정적 안내와 접근 가능한 빈 상태를 SSR로 제공하며 Client Island만 브라우저 저장소를 읽는다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19, TypeScript strict/noUncheckedIndexedAccess, Tailwind CSS 4, native IndexedDB, Vitest, Playwright, pnpm. 이번 단계에서는 AI 호출·Supabase/Neon 접근·DB 마이그레이션·서버 동기화를 추가하지 않는다.

**Spec:** `docs/superpowers/specs/2026-08-29-lumina-integrated-self-portrait-design.md`

## Global Constraints

- `any`를 사용하지 않는다. URL·IndexedDB·JSON 같은 외부 입력은 `unknown`에서 타입 가드와 허용 목록 검증을 거친다.
- Server Component를 기본으로 유지한다. IndexedDB, `sessionStorage`, `localStorage`, 클릭·삭제 상태는 명시적인 작은 Client Component에서만 사용한다.
- 원문 응답, 질문 문장, 자유서술, 이름·이메일·계정 ID, 출생 날짜·시각·장소, 관계 상대 정보, URL 전체를 통합 보관함·콘솔·분석 이벤트·내보내기에 넣지 않는다.
- 기존 `explorationLog`와 `ExplorationRecorder`는 완료 이력·추천 용도로 유지하며 결과 저장 책임을 추가하지 않는다.
- 저장은 직접 URL 방문·공유 결과 열람이 아니라 `markCompletionArrival`로 남긴 실제 완료 표식을 `consumeCompletionArrival`가 소비한 경우에만 수행한다.
- Big Five와 Jungian은 같은 IPIP-50 입력 출처인 `ipip-50-v1`으로 묶는다. 잠금 해제와 반복 증거는 서로 다른 `provenanceGroup`만 독립 근거로 센다.
- 현재 `pilot_withheld`인 인지평가는 이 MVP의 스냅샷·잠금·근거 그래프에서 제외한다. 실제 규준 ID와 공개 가능한 표준화 결과가 준비된 후 별도 승인으로 어댑터를 추가한다.
- 기존 `/r/[data]/all` 문화 해석 리포트와 `nav.all`은 수정하지 않는다. 새 기능의 고유 경로·번역·저장 키는 `/integrated-report`, `integratedPortrait`, `lumina-integrated-portrait-v1`이다.
- AI는 사용하지 않는다. 교차 구성개념 주장은 심리측정 검토가 끝난 레지스트리 항목만 허용하고, MVP 기본 레지스트리는 교차 주장 없이 단일 출처·상징 렌즈를 안전하게 표시한다.
- DB 변경, 원격 배포, Git push는 이 계획의 완료 조건이 아니며 별도 사람 승인이 필요하다.

---

## File Structure

| 경로 | 책임 |
| --- | --- |
| `src/lib/integratedPortrait/contracts.ts` | 스냅샷·신호·잠금·claim·캐릭터 recipe의 불변 공개 계약 |
| `src/lib/integratedPortrait/registry.ts` | 8개 허용 분석의 lane, 출처 그룹, 채점 버전, 안전 신호 허용 목록, 비교 규칙 |
| `src/lib/integratedPortrait/snapshot.ts` | 안전한 초안 생성, 검증, 직렬화, 최신 결과 선택, 잠금 계산 |
| `src/lib/integratedPortrait/adapters.ts` | Big Five/Jungian/Dark Triad/애착/EQ/사주/점성/수비학의 원문 없는 신호 어댑터 |
| `src/lib/integratedPortrait/vault.client.ts` | 브라우저 전용 IndexedDB·메모리 대체, 저장·제외·삭제·내보내기 |
| `src/lib/integratedPortrait/synthesis.ts` | 비교 가능성 검사, 근거 그래프, 안전한 단일 출처 claim, 결과 상태 |
| `src/lib/integratedPortrait/character.ts` | 신호 의미와 분리된 결정론적 레이어 recipe |
| `src/lib/integratedPortrait/__tests__/*.test.ts` | 계약, 개인정보 차단, 출처 중복, 잠금, 종합, 캐릭터 순수 테스트 |
| `src/components/report/IntegratedResultRecorder.tsx` | 완료 표식 소비 후 안전 스냅샷을 보관하는 Client Island |
| `src/components/report/IntegratedReportEntry.tsx` | 개별 결과에서 `/integrated-report`로 가는 접근 가능한 CTA |
| `src/components/home/IntegratedReportAtlasEntry.tsx` | 홈 자기 탐색 지도에 표시할 Client Island 진입점 |
| `src/components/integratedPortrait/IntegratedReportClient.tsx` | 보관함 수화, 잠금 상태, 제외·삭제·내보내기 상태를 가진 Client Island |
| `src/components/integratedPortrait/IntegratedPortraitHero.tsx` | 캐릭터·한 줄 설명·근거 요약의 접근 가능한 결과 머리말 |
| `src/components/integratedPortrait/EvidenceLanes.tsx` | 과학 관찰과 상징적 관점을 혼합하지 않고 병렬로 표시 |
| `src/components/integratedPortrait/PortraitControls.tsx` | 결과 제외, 전체 삭제, JSON 내보내기와 공용 기기 안내 |
| `src/app/integrated-report/page.tsx` | 정적 안내를 SSR로 렌더하는 새 Server Component 라우트 |
| `src/components/home/SelfAtlas.tsx` | 새 Atlas 진입점을 기존 완료 지도 옆에 조합 |
| `src/components/attachment/AttachmentResultClient.tsx` | 복원된 세션 요약에만 애착 스냅샷 recorder 연결 |
| `src/app/psychometrics/result/page.tsx` | Big Five 안전 초안과 CTA 연결 |
| `src/app/psychometrics/types/result/page.tsx` | Jungian 안전 초안과 CTA 연결 |
| `src/app/darktriad/result/page.tsx` | Dark Triad 안전 초안과 CTA 연결 |
| `src/app/eq/result/page.tsx` | EQ 안전 초안과 CTA 연결 |
| `src/components/BirthForm.tsx` | 사주·점성 결과 직전의 완료 표식 연결 |
| `src/components/numerology/NumerologyForm.tsx` | 수비학 결과 직전의 완료 표식 연결 |
| `src/app/r/[data]/page.tsx` | 사주 결과의 개인정보 없는 문화 스냅샷 초안 연결 |
| `src/app/r/[data]/astro/page.tsx` | 점성 결과의 개인정보 없는 문화 스냅샷 초안 연결 |
| `src/app/numerology/result/page.tsx` | 수비학 결과의 개인정보 없는 문화 스냅샷 초안 연결 |
| `messages/ko.json`, `messages/en.json` | `integratedPortrait`의 동기화된 UI 카피 |
| `src/app/globals.css` | 기존 scene/reading/result 토큰을 재사용하는 통합 자기초상 스타일 |
| `src/i18n/__tests__/messages.test.ts` | 새 언어 키·자리표시자 일치 회귀 검증 |
| `e2e/integrated-report.spec.ts` | 저장소 시드, 잠금→해제, 삭제, 차단, 언어·모션 E2E |

## Shared Interfaces

```ts
import type { AnalysisKey } from "@/engine/shared/evidence";

export type ResultLane = "scientific" | "cultural" | "situational" | "relational";
export type SnapshotBand = "low" | "mid" | "high";

export type SignalValue =
  | Readonly<{ kind: "band"; band: SnapshotBand }>
  | Readonly<{ kind: "category"; code: string }>
  | Readonly<{ kind: "observation"; code: string }>;

export interface ConstructSignalV1 {
  readonly constructId: string;
  readonly value: SignalValue;
  readonly descriptorIds: readonly string[];
  readonly limitationIds: readonly string[];
}

export interface ResultSnapshotV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly sourceAssessmentId: string;
  readonly analysisKey: AnalysisKey;
  readonly provenanceGroup: string;
  readonly lane: ResultLane;
  readonly instrumentVersion: string;
  readonly scoringModelVersion: string;
  readonly completedAt: string;
  readonly locale: "ko" | "en";
  readonly signals: readonly ConstructSignalV1[];
  readonly referenceIds: readonly string[];
}

export interface PortraitEligibility {
  readonly distinctAnalysisCount: number;
  readonly scientificProvenanceCount: number;
  readonly missingAnalysisCount: number;
  readonly missingScientificProvenanceCount: number;
  readonly isUnlocked: boolean;
}

export interface SynthesisClaimV1 {
  readonly claimId: string;
  readonly kind: "repetition" | "complement" | "tension" | "single-source";
  readonly status: "supported" | "contextual" | "exploratory";
  readonly sourceSignalIds: readonly string[];
  readonly counterSignalIds: readonly string[];
  readonly interpretationKey: string;
  readonly limitationIds: readonly string[];
  readonly experimentKey?: string;
}
```

`ResultSnapshotV1`에는 숫자 점수, 응답 배열, URL, 날짜·장소·이름·상대 식별자가 없다. 모든 MVP `band`는 규준 수치가 아니라 해당 분석 내부의 안전한 서술 구간이며 `standardizedScore`는 이 계획에서 생성하지 않는다.

### Task 1: 결과 계약·출처 레지스트리·잠금 규칙을 순수 모듈로 확정한다

**Files:**
- Create: `src/lib/integratedPortrait/contracts.ts`
- Create: `src/lib/integratedPortrait/registry.ts`
- Create: `src/lib/integratedPortrait/snapshot.ts`
- Test: `src/lib/integratedPortrait/__tests__/snapshot.test.ts`

- [ ] **Step 1: 출처 중복과 잠금 실패를 먼저 테스트한다.**

```ts
it("does not count Big Five and Jungian as two scientific provenance groups", () => {
  const eligibility = getPortraitEligibility([
    fixture("psychometrics", "ipip-50-v1"),
    fixture("jungian", "ipip-50-v1"),
    fixture("saju", "saju-symbolic-v1"),
  ]);

  expect(eligibility.distinctAnalysisCount).toBe(3);
  expect(eligibility.scientificProvenanceCount).toBe(1);
  expect(eligibility.isUnlocked).toBe(false);
});

it("unlocks only with three analyses and two distinct scientific provenance groups", () => {
  const eligibility = getPortraitEligibility([
    fixture("psychometrics", "ipip-50-v1"),
    fixture("darktriad", "sd3-27-v1"),
    fixture("numerology", "numerology-symbolic-v1"),
  ]);

  expect(eligibility).toMatchObject({
    distinctAnalysisCount: 3,
    scientificProvenanceCount: 2,
    isUnlocked: true,
  });
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/snapshot.test.ts`

Expected: 계약·레지스트리 모듈 부재로 실패한다.

- [ ] **Step 3: 불변 계약과 허용 레지스트리를 구현한다.**

`contracts.ts`는 `AnalysisKey` 기반 공개 타입만 내보낸다. `registry.ts`는 정확히 다음 MVP 항목만 `includeInPortrait: true`로 등록한다.

| 분석 | lane | provenanceGroup | scoringModelVersion |
| --- | --- | --- | --- |
| `psychometrics` | scientific | `ipip-50-v1` | `big-five-derived-v1` |
| `jungian` | scientific | `ipip-50-v1` | `jungian-derived-v1` |
| `darktriad` | scientific | `sd3-27-v1` | `dark-triad-derived-v1` |
| `attachment` | scientific | `attachment-ecrr-exploratory-v1` | `attachment-derived-v1` |
| `eq` | scientific | `eq-self-report-v1` | `eq-derived-v1` |
| `saju` | cultural | `saju-symbolic-v1` | `saju-symbolic-v1` |
| `astro` | cultural | `astro-symbolic-v1` | `astro-symbolic-v1` |
| `numerology` | cultural | `numerology-symbolic-v1` | `numerology-symbolic-v1` |

`cognitive`는 레지스트리에 `includeInPortrait: false`, `reason: "pilot_withheld"`로만 명시하고, `getPortraitEligibility`의 입력에서 항상 제외한다. `snapshot.ts`는 유효한 스냅샷만 받고 분석 키별 최신 완료 결과를 고른 뒤 고유 `analysisKey`와 고유 과학 `provenanceGroup`을 각각 세어 `PortraitEligibility`을 반환한다.

- [ ] **Step 4: 테스트를 통과시킨다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/snapshot.test.ts`

Expected: 같은 IPIP-50 출처 중복, 재검사 최신 선택, 보류 인지평가 제외, 3+2 잠금 조건이 통과한다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- src/lib/integratedPortrait`

Commit: `feat: add integrated portrait snapshot contract`

### Task 2: 개인정보 없는 결과 어댑터와 거부 검증을 구현한다

**Files:**
- Create: `src/lib/integratedPortrait/adapters.ts`
- Create: `src/lib/integratedPortrait/validation.ts`
- Test: `src/lib/integratedPortrait/__tests__/adapters.test.ts`
- Test: `src/lib/integratedPortrait/__tests__/validation.test.ts`

- [ ] **Step 1: 금지 데이터와 규준 오용을 먼저 테스트한다.**

```ts
it("rejects a snapshot carrying a raw response or birth field", () => {
  expect(validateSnapshot({ ...validSnapshot, responses: [1, 2] })).toEqual({ ok: false, reason: "unknown-field" });
  expect(validateSnapshot({ ...validSnapshot, birthDate: "2000-01-01" })).toEqual({ ok: false, reason: "unknown-field" });
});

it("does not emit a standardized score from a share-code fallback", () => {
  const snapshot = toBigFiveSnapshot(bigFiveWithFallbackTScore, input);
  expect(snapshot.signals).not.toContainEqual(expect.objectContaining({ value: expect.objectContaining({ standardizedScore: expect.any(Number) }) }));
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/adapters.test.ts src/lib/integratedPortrait/__tests__/validation.test.ts`

Expected: 어댑터·검증기가 없어서 실패한다.

- [ ] **Step 3: 허용 목록 기반 어댑터를 구현한다.**

각 어댑터는 기존 `shareCode.ts`의 파생 요약 또는 서버 결과 view에서 아래의 코드만 생성한다. 원문 응답·정수 점수·공유 코드·URL은 함수 인자나 반환값에 넣지 않는다.

| 분석 | 허용 신호 |
| --- | --- |
| Big Five | `bigfive.extraversion`, `bigfive.agreeableness`, `bigfive.conscientiousness`, `bigfive.emotional-stability`, `bigfive.openness`의 `low/mid/high` |
| Jungian | `jungian.attitude`, `jungian.perception`, `jungian.decision`, `jungian.lifestyle`의 범주 코드 |
| Dark Triad | `darktriad.machiavellianism`, `darktriad.narcissism`, `darktriad.psychopathy`의 `low/mid/high` |
| 애착 | `attachment.style`, `attachment.anxiety`, `attachment.avoidance`의 범주·구간 코드 |
| EQ | `eq.self-awareness`, `eq.self-regulation`, `eq.motivation`, `eq.empathy`, `eq.social-skills`의 `low/mid/high` |
| 사주 | 우세 오행, 일간 오행, 강약 판정, 시간 미상 여부 |
| 점성 | 태양·달·상승궁의 부호 코드, 시간 미상·달 모호·하우스 대체 여부 |
| 수비학 | 생명수, destiny 존재 여부의 범주 코드 |

`validation.ts`는 정확한 최상위 키, 레지스트리 분석 키·lane·출처 그룹·버전, ISO 시각, 허용 construct ID·value 형태만 통과시킨다. `sourceAssessmentId`와 `id`는 원문을 해시하거나 URL을 복사하지 않고 recorder가 생성한 UUID 형식만 허용한다.

- [ ] **Step 4: 테스트를 통과시킨다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/adapters.test.ts src/lib/integratedPortrait/__tests__/validation.test.ts`

Expected: 8개 안전 fixture의 직렬화·역직렬화, 금지 필드 차단, fallback 점수 비저장, `pilot_withheld` 제외가 통과한다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- src/lib/integratedPortrait`

Commit: `feat: add safe integrated portrait adapters`

### Task 3: 브라우저 전용 보관함과 완료 표식 소비를 구현한다

**Files:**
- Create: `src/lib/integratedPortrait/vault.client.ts`
- Create: `src/lib/integratedPortrait/__tests__/vault.test.ts`
- Create: `src/components/report/IntegratedResultRecorder.tsx`
- Test: `src/lib/__tests__/completionCinematic.test.ts`

- [ ] **Step 1: 저장소 선택·차단·완료 표식 흐름을 먼저 테스트한다.**

```ts
it("keeps only the latest selected snapshot per analysis without changing prior stored history", () => {
  const selected = selectCurrentSnapshots([olderBigFive, newestBigFive, darkTriad]);
  expect(selected.map((snapshot) => snapshot.id)).toEqual([newestBigFive.id, darkTriad.id]);
});

it("does not call the vault when there is no completion arrival marker", async () => {
  render(<IntegratedResultRecorder snapshot={validSnapshot} />);
  await waitFor(() => expect(mockVault.upsert).not.toHaveBeenCalled());
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/vault.test.ts src/lib/__tests__/completionCinematic.test.ts`

Expected: browser vault와 recorder가 없어서 실패한다.

- [ ] **Step 3: IndexedDB와 메모리 대체를 구현한다.**

`vault.client.ts`는 `"use client"`를 두지 않는 일반 browser-only 모듈이지만 `window`가 없는 환경에서 IndexedDB를 열지 않는다. `openPortraitVault()`는 `lumina-integrated-portrait-v1` 데이터베이스의 `snapshots` object store와 `analysisKey`·`completedAt` 인덱스를 만든다. 공개 API는 `listSnapshots`, `upsertSnapshot`, `excludeSnapshot`, `deleteAllSnapshots`, `exportSnapshots`다.

IndexedDB 접근 예외·보안 차단·용량 오류에는 검증된 스냅샷만 메모리 배열로 보관하고 `{ persistence: "memory" }`를 반환한다. `deleteAllSnapshots`는 현재 탭 메모리도 비운다. JSON 내보내기는 다운로드 실행 전 `validateSnapshot`을 다시 통과시킨 배열만 반환한다.

`IntegratedResultRecorder`는 `"use client"`에서 `useEffect`로 동작한다. 전달된 후보를 먼저 검증하고 `consumeCompletionArrival(snapshot.analysisKey)`가 `true`일 때만 UUID를 생성해 저장한다. 렌더링은 `null`이고, 실패를 콘솔에 기록하지 않으며, 보관함 오류는 다음 `/integrated-report` 상태에서 사용자에게 안내한다.

- [ ] **Step 4: 테스트를 통과시킨다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/vault.test.ts src/lib/__tests__/completionCinematic.test.ts`

Expected: 서버 렌더에서 browser API 미접근, 완료 표식 없는 방문 미저장, 차단 시 메모리 대체, 삭제·내보내기 유효성 검증이 통과한다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- src/lib/integratedPortrait src/components/report/IntegratedResultRecorder.tsx`

Commit: `feat: add local integrated portrait vault`

### Task 4: 기존 완료 흐름에 안전한 스냅샷 recorder를 연결한다

**Files:**
- Modify: `src/app/psychometrics/result/page.tsx`
- Modify: `src/app/psychometrics/types/result/page.tsx`
- Modify: `src/app/darktriad/result/page.tsx`
- Modify: `src/app/eq/result/page.tsx`
- Modify: `src/components/attachment/AttachmentResultClient.tsx`
- Modify: `src/components/BirthForm.tsx`
- Modify: `src/components/numerology/NumerologyForm.tsx`
- Modify: `src/app/r/[data]/page.tsx`
- Modify: `src/app/r/[data]/astro/page.tsx`
- Modify: `src/app/numerology/result/page.tsx`
- Test: `src/lib/integratedPortrait/__tests__/adapters.test.ts`
- Test: `e2e/integrated-report.spec.ts`

- [ ] **Step 1: 실 완료·직접 방문의 차이를 먼저 E2E로 작성한다.**

```ts
test("direct result URL does not create a portrait snapshot", async ({ page }) => {
  await page.goto(`/psychometrics/result?r=${"1".repeat(50)}`);
  await page.goto("/integrated-report");
  await expect(page.getByTestId("integrated-report-count")).toHaveText("0");
});

test("a completed scientific result records only its safe snapshot", async ({ page }) => {
  await completeBigFiveFixture(page);
  await page.goto("/integrated-report");
  await expect(page.getByTestId("integrated-report-count")).toHaveText("1");
  await expect(page.locator("body")).not.toContainText("original response sentinel");
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --grep "direct result|completed scientific" --workers=1`

Expected: `/integrated-report`와 recorder 연결 전에는 실패한다.

- [ ] **Step 3: 과학·문화 흐름을 최소 변경으로 연결한다.**

각 Server Component 결과 페이지는 기존 서버 계산 직후 안전 어댑터를 호출하고, `ExplorationRecorder` 인접에 `<IntegratedResultRecorder snapshot={...} />`만 추가한다. `?r=` 입력·share code·raw scores·query string은 props로 넘기지 않는다. 애착은 `AttachmentResultClient`가 이미 복원한 안전한 view에서만 동일 컴포넌트를 렌더한다.

`BirthForm`은 성공적으로 프로필을 검증·인코딩한 뒤 `resultSuffix`가 `""`이면 `saju`, `"/astro"`이면 `astro` 완료 표식을 남긴 후 이동한다. `NumerologyForm`은 유효한 입력을 확인하고 결과 라우트로 이동하기 직전에 `numerology` 표식을 남긴다. 세 문화 결과 페이지는 화면용 view에서만 안전 신호를 추출한다. 출생 날짜, 이름, 위치, 시각, 하우스 각도, profile serialization은 adapter 입력·snapshot·CTA props에 넣지 않는다.

`src/app/cognitive/result/[runId]/page.tsx`는 이 단계에서 수정하지 않는다. 공개 표준화 결과 상태가 아닌 `pilot_withheld`은 recorder를 절대 렌더하지 않는다는 회귀 테스트를 추가한다.

- [ ] **Step 4: 단위·E2E를 통과시킨다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/adapters.test.ts`

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --grep "direct result|completed scientific|pilot" --workers=1`

Expected: 실 완료는 한 개의 안전 결과만 기록하고 직접 방문·공유·보류 인지는 기록하지 않는다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- <listed result-flow files>`

Commit: `feat: capture completed results for integrated portrait`

### Task 5: 근거 그래프·결정론적 claim·캐릭터 recipe를 구현한다

**Files:**
- Create: `src/lib/integratedPortrait/synthesis.ts`
- Create: `src/lib/integratedPortrait/character.ts`
- Test: `src/lib/integratedPortrait/__tests__/synthesis.test.ts`
- Test: `src/lib/integratedPortrait/__tests__/character.test.ts`

- [ ] **Step 1: 교차 해석 금지와 결정론을 먼저 테스트한다.**

```ts
it("never creates a supported claim from the same IPIP-50 provenance group", () => {
  const claims = createSynthesis([bigFiveSnapshot, jungianSnapshot]);
  expect(claims.some((claim) => claim.status === "supported")).toBe(false);
});

it("keeps cultural observations in a separate exploratory lane", () => {
  const report = createSynthesis([bigFiveSnapshot, sajuSnapshot]);
  expect(report.scientificClaims.every((claim) => claim.sourceSignalIds.every(isScientificId))).toBe(true);
  expect(report.culturalObservations).toHaveLength(1);
});

it("creates the same character recipe regardless of snapshot input order", () => {
  expect(createCharacterRecipe([darkTriadSnapshot, bigFiveSnapshot]))
    .toEqual(createCharacterRecipe([bigFiveSnapshot, darkTriadSnapshot]));
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/synthesis.test.ts src/lib/integratedPortrait/__tests__/character.test.ts`

Expected: synthesis·character 모듈 부재로 실패한다.

- [ ] **Step 3: 보수적 근거 그래프를 구현한다.**

`registry.ts`의 MVP comparison rule은 명시적으로 승인된 동일 구성개념·서로 다른 출처 그룹이 생기기 전까지 `not-comparable`을 기본값으로 한다. 따라서 현재 공개 UI는 다음만 생성한다.

- 과학 lane: 각 최신 과학 결과의 `single-source`·`exploratory` claim과 도구 한계.
- 문화 lane: 상징적 관점 카드와 성찰 질문. 과학 claim의 출처가 되지 않는다.
- 잠금 이후 hero: 관점 수와 출처 수를 사실로만 서술하는 한 줄 문장.

향후 전문가가 comparison rule을 추가하면 `comparable`, `complementary`, `not-comparable` 중 하나와 검토 근거·날짜·허용 문장을 함께 등록해야 한다. `supported`는 서로 다른 `provenanceGroup` 두 개 이상, 허용 비교 규칙, 반대 신호 부재가 모두 있을 때만 생성한다.

`character.ts`는 정렬된 snapshot의 공개 `analysisKey`와 schema/rule 버전만 해시해 background, frame, accent, motion seed를 선택한다. 측정값·신호 코드와 캐릭터 모양의 의미 매핑을 만들지 않는다. 에셋 누락 시 `fallback` recipe를 반환한다.

- [ ] **Step 4: 테스트를 통과시킨다.**

Run: `pnpm exec vitest run src/lib/integratedPortrait/__tests__/synthesis.test.ts src/lib/integratedPortrait/__tests__/character.test.ts`

Expected: 동일 출처 반복 차단, lane 분리, 입력 순서 독립성, `not-comparable` 차단이 통과한다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- src/lib/integratedPortrait`

Commit: `feat: synthesize evidence-separated portraits`

### Task 6: SSR 우선 통합 리포트와 진입점을 구현한다

**Files:**
- Create: `src/app/integrated-report/page.tsx`
- Create: `src/components/integratedPortrait/IntegratedReportClient.tsx`
- Create: `src/components/integratedPortrait/IntegratedPortraitHero.tsx`
- Create: `src/components/integratedPortrait/EvidenceLanes.tsx`
- Create: `src/components/integratedPortrait/PortraitControls.tsx`
- Create: `src/components/report/IntegratedReportEntry.tsx`
- Create: `src/components/home/IntegratedReportAtlasEntry.tsx`
- Modify: `src/components/home/SelfAtlas.tsx`
- Modify: `src/app/psychometrics/result/page.tsx`
- Modify: `src/app/psychometrics/types/result/page.tsx`
- Modify: `src/app/darktriad/result/page.tsx`
- Modify: `src/app/eq/result/page.tsx`
- Modify: `src/components/attachment/AttachmentResultClient.tsx`
- Modify: `src/app/r/[data]/page.tsx`
- Modify: `src/app/r/[data]/astro/page.tsx`
- Modify: `src/app/numerology/result/page.tsx`
- Test: `e2e/integrated-report.spec.ts`

- [ ] **Step 1: SSR 빈 상태와 잠금 상태의 접근성 테스트를 작성한다.**

```ts
test("renders the integrated portrait route without stored browser data", async ({ page }) => {
  await page.goto("/integrated-report");
  await expect(page.getByRole("heading", { name: /통합 자기초상|Integrated Self Portrait/ })).toBeVisible();
  await expect(page.getByTestId("integrated-report-state")).toHaveAttribute("data-state", "empty");
});

test("shows the exact missing unlock requirements", async ({ page }) => {
  await seedPortraitSnapshots(page, [bigFiveSnapshot, sajuSnapshot]);
  await page.goto("/integrated-report");
  await expect(page.getByTestId("integrated-report-state")).toHaveAttribute("data-state", "locked");
  await expect(page.getByText(/과학적 관점 1개|1 scientific perspective/)).toBeVisible();
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --grep "without stored|missing unlock" --workers=1`

Expected: route·Client Island·test IDs가 없어 실패한다.

- [ ] **Step 3: Server/Client 경계를 구현한다.**

`page.tsx`는 `getTranslations`, `SceneShell`, h1, 로컬 저장 안내, JavaScript 없이도 읽히는 빈 상태 설명만 SSR로 렌더하고 `<IntegratedReportClient />`를 작게 삽입한다. Client Island는 `useSyncExternalStore` 또는 동등한 SSR-safe subscription으로 vault 상태를 읽고, `data-integrated-report-state`, `data-integrated-report-count`, `data-integrated-report-entry`를 제공한다.

상태는 `empty`, `locked`, `unlocked`, `memory-only`, `error`로 분리한다. 잠금 화면은 서로 다른 분석 수·과학 출처 그룹 수·남은 수를 숫자 합산 없이 보여 준다. 해제 화면은 `IntegratedPortraitHero`, 과학 관찰, 상징적 관점, 근거/한계 `<details>`, 결과별 제외와 삭제/내보내기를 차례로 렌더한다.

`SelfAtlas.tsx`에는 별도 `IntegratedReportAtlasEntry`만 추가한다. 각 개별 결과에는 `MethodNote` 뒤, `NextLens` 앞에 `IntegratedReportEntry`를 추가한다. 기존 `NextLens`, `ExplorationRecorder`, `/r/[data]/all`은 수정하지 않는다.

- [ ] **Step 4: E2E를 통과시킨다.**

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --grep "without stored|missing unlock|unlocked" --workers=1`

Expected: 새 컨텍스트 빈 상태, 정확한 잠금 이유, 해제 후 lane 분리와 CTA가 통과한다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- <listed route and component files>`

Commit: `feat: add integrated self portrait experience`

### Task 7: 한국어 우선 카피·시각 시스템·접근성 대체를 완성한다

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `src/i18n/__tests__/messages.test.ts`
- Modify: `src/app/globals.css`
- Test: `e2e/integrated-report.spec.ts`

- [ ] **Step 1: 언어 키 동기화와 모션 대체 테스트를 작성한다.**

```ts
test("keeps integrated portrait message keys and placeholders aligned", () => {
  expect(getMessageShape(ko.integratedPortrait)).toEqual(getMessageShape(en.integratedPortrait));
});

test("uses a non-animated character fallback under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedUnlockedPortrait(page);
  await page.goto("/integrated-report");
  await expect(page.getByTestId("integrated-character")).toHaveAttribute("data-motion", "reduced");
});
```

- [ ] **Step 2: 실패를 확인한다.**

Run: `pnpm exec vitest run src/i18n/__tests__/messages.test.ts`

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --grep "reduced motion" --workers=1`

Expected: 새 번역·스타일·character data attribute 전에는 실패한다.

- [ ] **Step 3: 기존 디자인 토큰 위에 새 화면을 스타일링한다.**

`integratedPortrait` 최상위 번역 묶음에 제목, 상태, lane 라벨, 근거/한계, 공용 기기 경고, 삭제 확인, 내보내기 안내를 한국어·영어로 같은 키와 placeholder 집합으로 추가한다. `globals.css`는 기존 `scene-shell`, `reading-panel`, `result-cover`, reduced-motion, print 규칙을 재사용하는 `integrated-portrait-*` 범위 선택자만 추가한다.

캐릭터 레이어는 `aria-hidden="true"`이며, h1·한 줄 설명·사용한 관점 수·근거/한계는 텍스트로 항상 남긴다. 색상만으로 lane을 구분하지 않고 아이콘·문구·테두리를 병행한다. 390px, 768px, 1440px에서 CSS grid가 단일 열로 안전하게 접히며, `prefers-reduced-motion: reduce`와 print에서 장식 모션·배경을 줄이고 본문은 남긴다.

- [ ] **Step 4: i18n·접근성 테스트를 통과시킨다.**

Run: `pnpm exec vitest run src/i18n/__tests__/messages.test.ts`

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --grep "Korean|English|reduced motion|mobile" --workers=1`

Expected: 두 언어 키 일치, 감소 모션, 작은 화면의 핵심 정보 가시성이 통과한다.

- [ ] **Step 5: 이 작업만 검토하고 커밋한다.**

Run: `git diff --check` and `git diff -- messages src/app/globals.css src/i18n`

Commit: `feat: polish integrated portrait accessibility`

### Task 8: 전체 회귀·개인정보·릴리스 준비를 검증한다

**Files:**
- Modify: `e2e/integrated-report.spec.ts`
- Modify: `docs/superpowers/specs/2026-08-29-lumina-integrated-self-portrait-design.md`
- Modify: this plan task checkboxes only after each corresponding verification succeeds

- [ ] **Step 1: 저장소 차단·제외·삭제·내보내기 E2E를 추가한다.**

```ts
test("falls back to a session-only explanation when IndexedDB is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
  });
  await completeBigFiveFixture(page);
  await page.goto("/integrated-report");
  await expect(page.getByTestId("integrated-report-state")).toHaveAttribute("data-state", "memory-only");
});

test("excludes and deletes only the user's local snapshots", async ({ page }) => {
  await seedUnlockedPortrait(page);
  await page.goto("/integrated-report");
  await page.getByRole("button", { name: /결과 제외|Exclude result/ }).first().click();
  await page.getByRole("button", { name: /전체 삭제|Delete all/ }).click();
  await expect(page.getByTestId("integrated-report-count")).toHaveText("0");
});
```

- [ ] **Step 2: 전체 검증을 실행한다.**

Run: `pnpm typecheck`

Run: `pnpm lint`

Run: `pnpm test`

Run: `pnpm exec playwright test e2e/integrated-report.spec.ts --workers=1`

Run: `pnpm build`

Expected: 타입·린트·단위·통합 E2E·프로덕션 빌드가 모두 통과한다. 병렬 E2E 오류가 발생하면 먼저 `--workers=1` 결과로 기능 오류인지 환경 경합인지 분리한다.

- [ ] **Step 3: 개인정보 회귀를 수동 확인한다.**

`rg -n "responses|birthDate|birthTime|location|profile|shareCode|URLSearchParams" src/lib/integratedPortrait src/components/integratedPortrait src/components/report/IntegratedResultRecorder.tsx` 결과를 검토한다. 허용된 UI 문구 외 원문 데이터 보관·로그·내보내기가 없는지 확인한다. Playwright trace와 브라우저 IndexedDB를 열어 object store가 `ResultSnapshotV1` 허용 키만 보관하는지 확인한다.

- [ ] **Step 4: 변경 범위를 확정하고 로컬 커밋한다.**

Run: `git status --short`

Run: `git diff --check`

Stage only: 이 계획에서 변경한 파일만 `git add -- <explicit paths>`로 추가한다. 기존 attachment/tarot/saju 및 기타 미커밋 변경은 절대 포함하지 않는다.

Commit: `feat: deliver local integrated self portrait mvp`

- [ ] **Step 5: 배포 경계를 보고한다.**

이 단계에서는 Git push·Vercel 배포·Supabase/Neon 변경을 실행하지 않는다. 모든 검증 결과와 남은 과학 검토·브라우저 로컬 저장 위험을 보고하고, Preview 배포 또는 동기화/RLS 다음 단계를 진행하려면 별도 사람 승인을 받는다.

## Acceptance Checklist

- [ ] 새 `/integrated-report`가 SSR에서 제목·로컬 저장 안내·빈 상태 설명을 제공한다.
- [ ] 실제 완료 흐름만 5개 과학 + 3개 문화 결과의 안전한 스냅샷을 기록한다.
- [ ] Big Five/Jungian의 동일 IPIP-50 출처는 독립 과학 근거 하나로만 계산된다.
- [ ] `pilot_withheld` 인지평가는 통합 입력에서 제외된다.
- [ ] 과학적 관찰과 상징적 관점이 claim·UI·색상 외 라벨에서 분리된다.
- [ ] 결과 제외·전체 삭제·JSON 내보내기·IndexedDB 차단 대체가 작동한다.
- [ ] 원문 응답·출생 정보·계정 정보가 local vault·URL·이벤트·로그에 나타나지 않는다.
- [ ] 한국어·영어 키가 일치하고 키보드·감소 모션·이미지 실패·모바일이 회귀하지 않는다.
- [ ] typecheck, lint, test, serial E2E, production build가 통과한다.
