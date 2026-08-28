# 표준화 인지검사 파일럿 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한국 성인 18–64세 대상의 표준화 연구용 IQ 추정치를 위한, 보안·RLS·적응형 출제·벡터 시각 문항을 갖춘 파일럿 전용 검사 플랫폼을 구축한다.

**Architecture:** 기존 16문항 탐색형의 클라이언트 정답 키와 URL 응답 전달을 중단하고, 서버 전용 문항은행과 Supabase 익명 인증 소유 실행으로 바꾼다. Next.js Server Component는 실행·결과를 읽고, 작은 Client Component는 브라우저 상호작용만 담당한다. IRT 선택·채점은 순수 엔진과 `server-only` DAL에서 수행하며, 공개 화면은 파일럿 상태에서는 IQ·백분위·문항 해설을 노출하지 않는다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19, TypeScript strict/noUncheckedIndexedAccess, Supabase Postgres/Auth/RLS, Tailwind CSS 4, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-28-cognitive-standardized-iq-design.md`

## Global Constraints

- 대상은 한국 성인 만 18–64세이며, 공개 전 결과 명칭은 `LUMINA 연구용 IQ 추정치`이다.
- 규준화·신뢰도·타당도·DIF·재검사·외부 준거 검증이 완료되기 전에는 IQ, 백분위, z점수, T점수, 능력 순위를 계산하거나 노출하지 않는다.
- `any`를 사용하지 않는다. 모든 외부 입력은 `unknown`에서 타입 가드 또는 명시적 스키마 검증을 거친다.
- 페이지·레이아웃은 Server Component 기본을 유지한다. 상태·이벤트·브라우저 API가 필요한 최소 컴포넌트만 `"use client"`를 사용한다.
- 정답 키, IRT 문항 모수, 출제 시드, 연구 원자료, service_role 키는 `server-only` 모듈과 비공개 Supabase 스키마에만 둔다. `NEXT_PUBLIC_` 변수에는 공개 URL·publishable key만 둔다.
- 모든 공개 스키마 테이블은 RLS·최소 GRANT·allow/deny SQL 테스트를 함께 가진다. service_role은 서버 DAL의 비공개 데이터 접근과 연구 집계에만 사용한다.
- 기존 `/cognitive/result?r=` 및 `/s/cognitive/*`는 새 점수 검사에 사용하지 않는다. 점수용 실행·응답·정답은 URL 또는 공유 카드에 넣지 않는다.
- 점수용 문항과 해설형 연습 문항은 ID, 자산, 저장소, URL, 결과 데이터를 분리한다.
- 마이그레이션 작성은 이 계획의 범위다. `supabase db reset`, 원격 마이그레이션 실행, 표본 수집, 외부 연구 데이터 전송은 별도 사람 승인이 있어야 한다.
- 한국어·영어 메시지 키와 자리표시자 집합을 동기화하고, 그림 문항은 색상만으로 정보를 구분하지 않는다.

---

## File Structure

| 경로 | 책임 |
| --- | --- |
| `src/engine/cognitive-standardized/types.ts` | 공개 자극·비공개 문항·IRT·실행 상태의 불변 타입 |
| `src/engine/cognitive-standardized/irt.ts` | 2PL/3PL 확률·정보량·능력 추정의 순수 계산 |
| `src/engine/cognitive-standardized/selection.ts` | 청사진·노출·최근 출제 조건을 만족하는 다음 문항 선택 |
| `src/engine/cognitive-standardized/scoring.ts` | 파일럿 보류/표준화 결과 상태를 구분하는 순수 결과 계약 |
| `src/engine/cognitive-standardized/__tests__/*.test.ts` | 엔진 수학·출제 제약·점수 보류 회귀 테스트 |
| `src/lib/supabase/browser.ts` | publishable key만 사용하는 브라우저 Supabase 클라이언트 |
| `src/lib/supabase/server.ts` | 쿠키 기반 사용자 컨텍스트의 서버 Supabase 클라이언트 |
| `src/lib/supabase/admin.ts` | `server-only` service_role 관리자 클라이언트 |
| `src/server/cognitive/auth.ts` | 익명 Auth 주체·지원 조건을 서버에서 다시 확인 |
| `src/server/cognitive/repository.ts` | 비공개 문항·배정·응답·결과의 DAL, 클라이언트 반환 DTO 필터 |
| `src/server/cognitive/runs.ts` | 시작·다음 문항·응답 제출·재개를 원자적으로 조합 |
| `src/app/cognitive/actions.ts` | 얇은 Server Action 경계와 입력 검증·소유권 재확인 |
| `src/app/cognitive/run/[runId]/page.tsx` | 동적 Server Component 실행 페이지 |
| `src/app/cognitive/result/[runId]/page.tsx` | 소유 실행의 파일럿/공개 상태 결과 페이지 |
| `src/components/cognitive/StandardizedRunClient.tsx` | 문항 표시·제출·재개 상호작용 전용 Client Component |
| `src/components/cognitive/PracticeForm.tsx` | 점수은행과 분리된 해설형 연습 문항 UX |
| `src/components/cognitive/figures/*` | 선언형 행렬·공간 도형 SVG 렌더러 |
| `supabase/migrations/20260828000000_cognitive_pilot.sql` | 스키마, private/public 권한, RLS, RPC 및 인덱스 |
| `supabase/tests/cognitive_pilot_rls.test.sql` | 주체별 허용·차단 SQL 테스트 |
| `e2e/cognitive-standardized.spec.ts` | 파일럿 실행, 다른 출제, 재개, 보류 결과 E2E |
| `e2e/cognitive-security.spec.ts` | URL·DOM·번들·공유 화면의 정답/응답 비노출 E2E |
| `docs/assessment/cognitive-item-authoring.md` | 문항 원작성·검토·인지면담·보정 상태 가이드 |

## Shared Interfaces

```ts
export type StandardizedDomain = "gf" | "gc" | "gv" | "gwm" | "gs";
export type RunStatus = "active" | "paused" | "completed" | "invalid";
export type ResultStatus = "pilot_withheld" | "standardized_scored" | "ineligible";

export interface MatrixCell {
  readonly kind: "figure" | "blank";
  readonly shape: "circle" | "square" | "triangle" | "diamond" | "arrow" | null;
  readonly fill: "none" | "hatch" | "solid" | null;
  readonly rotationDegrees: number | null;
}

export interface Voxel {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DeviceCapability {
  readonly locale: "ko" | "en";
  readonly device: "desktop" | "tablet" | "mobile";
  readonly keyboard: boolean;
}

export interface StandardizedScore {
  readonly fullScaleIq: number;
  readonly percentile: number;
  readonly confidenceInterval95: readonly [lower: number, upper: number];
  readonly normVersion: string;
}

export type CognitiveStimulus =
  | Readonly<{ kind: "text"; textKo: string; textEn: string }>
  | Readonly<{ kind: "matrix"; cells: readonly MatrixCell[] }>
  | Readonly<{ kind: "spatial"; cubes: readonly Voxel[] }>;

export interface PresentationOption {
  readonly id: string;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly figure: CognitiveStimulus | null;
}

export interface InternalItem {
  readonly versionId: string;
  readonly domain: StandardizedDomain;
  readonly presentation: Omit<ItemPresentation, "assignmentId" | "ordinal">;
  readonly correctOptionId: string;
  readonly parameters: Readonly<{ discrimination: number; difficulty: number; guessing: number }>;
  readonly exposureRate: number;
}

export interface Blueprint {
  readonly minimumByDomain: Readonly<Record<StandardizedDomain, number>>;
  readonly maximumByDomain: Readonly<Record<StandardizedDomain, number>>;
  readonly maxExposureRate: number;
  readonly targetStandardError: number;
  readonly maximumItems: number;
}

export interface StartRunInput {
  readonly consent: Readonly<{ operationalStorage: true; researchParticipation: boolean }>;
  readonly capability: DeviceCapability;
}

export interface ScoreRunInput {
  readonly releaseMode: "pilot" | "standardized";
  readonly standardizationEligible: boolean;
  readonly normVersion: string | null;
  readonly score: StandardizedScore | null;
}

export type ScoredRun =
  | Readonly<{ status: "pilot_withheld"; score: null }>
  | Readonly<{ status: "standardized_scored"; score: StandardizedScore }>;

export interface ItemPresentation {
  readonly assignmentId: string;
  readonly ordinal: number;
  readonly domain: StandardizedDomain;
  readonly stimulus: CognitiveStimulus;
  readonly options: readonly PresentationOption[];
}

export interface RunSnapshot {
  readonly runId: string;
  readonly status: RunStatus;
  readonly nextItem: ItemPresentation | null;
  readonly answeredCount: number;
  readonly targetItemCount: number;
}

export interface SubmissionResult {
  readonly run: RunSnapshot;
  readonly error: "invalid_run" | "stale_assignment" | "invalid_option" | null;
}
```

`ItemPresentation`에는 정답, 정답 인덱스, 난이도, 변별도, 추측 모수, 시드, 다른 후보 문항을 절대 추가하지 않는다.

### Task 1: 표준화 엔진 계약과 IRT 순수 계산

**Files:**
- Create: `src/engine/cognitive-standardized/types.ts`
- Create: `src/engine/cognitive-standardized/irt.ts`
- Create: `src/engine/cognitive-standardized/selection.ts`
- Create: `src/engine/cognitive-standardized/scoring.ts`
- Test: `src/engine/cognitive-standardized/__tests__/irt.test.ts`
- Test: `src/engine/cognitive-standardized/__tests__/selection.test.ts`
- Test: `src/engine/cognitive-standardized/__tests__/scoring.test.ts`

**Interfaces:**
- Produces: `ItemPresentation`, `InternalItem`, `Blueprint`, `selectNextItem`, `probabilityCorrect`, `itemInformation`, `scoreRun`.
- Consumes: 기존 `src/engine/shared/random.ts`의 결정론적 난수 유틸리티. 서버가 만든 비공개 시드만 전달한다.

- [ ] **Step 1: 실패하는 IRT·출제 제약 테스트를 작성한다.**

```ts
import { describe, expect, it } from "vitest";
import { itemInformation, probabilityCorrect } from "../irt";

describe("3PL item functions", () => {
  const item = { discrimination: 1.2, difficulty: 0, guessing: 0.25 } as const;

  it("is bounded by guessing and one", () => {
    expect(probabilityCorrect(-8, item)).toBeGreaterThanOrEqual(item.guessing);
    expect(probabilityCorrect(8, item)).toBeLessThanOrEqual(1);
  });

  it("has positive information near its difficulty", () => {
    expect(itemInformation(0, item)).toBeGreaterThan(0);
  });
});
```

```ts
it("never returns an item that violates domain quota or exposure cap", () => {
  const result = selectNextItem(fixtureStateWithGfQuotaFilled);
  expect(result?.domain).not.toBe("gf");
  expect(result?.exposureRate).toBeLessThanOrEqual(fixtureStateWithGfQuotaFilled.maxExposureRate);
});
```

- [ ] **Step 2: 새 테스트가 현재 모듈 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/engine/cognitive-standardized/__tests__/irt.test.ts src/engine/cognitive-standardized/__tests__/selection.test.ts src/engine/cognitive-standardized/__tests__/scoring.test.ts`

Expected: FAIL because the engine modules do not exist yet.

- [ ] **Step 3: 불변 타입과 순수 수학 함수를 구현한다.**

```ts
export function probabilityCorrect(
  theta: number,
  parameters: Readonly<{ discrimination: number; difficulty: number; guessing: number }>,
): number {
  const exponent = -parameters.discrimination * (theta - parameters.difficulty);
  return parameters.guessing + (1 - parameters.guessing) / (1 + Math.exp(exponent));
}

export function itemInformation(
  theta: number,
  parameters: Readonly<{ discrimination: number; difficulty: number; guessing: number }>,
): number {
  const probability = probabilityCorrect(theta, parameters);
  const numerator = parameters.discrimination ** 2 * (probability - parameters.guessing) ** 2;
  return numerator / ((1 - parameters.guessing) ** 2 * probability * (1 - probability));
}
```

`selectNextItem`은 `Blueprint`의 영역 최소/최대 수, 최근 item version ID, 노출률, 현재 theta 정보량을 모두 필터한 뒤 정보량 상위 randomesque 후보(최대 5개)에서 서버 시드 난수를 사용한다. 후보가 없으면 `null`을 반환하며, 임의의 제약 위반 문항으로 폴백하지 않는다.

- [ ] **Step 4: 파일럿 보류 결과 계약을 구현한다.**

```ts
export function scoreRun(input: ScoreRunInput): ScoredRun {
  if (input.releaseMode !== "standardized" || !input.standardizationEligible) {
    return Object.freeze({ status: "pilot_withheld" as const, score: null });
  }
  if (input.normVersion === null || input.score === null) {
    throw new Error("approved norm version is required");
  }
  return Object.freeze({ status: "standardized_scored" as const, score: input.score });
}
```

`pilot_withheld`에서는 IQ, 백분위, 하위지수, 정답률을 반환하지 않는다.

- [ ] **Step 5: 엔진 테스트와 타입 검사를 통과시키고 커밋한다.**

Run: `pnpm vitest run src/engine/cognitive-standardized/__tests__`

Run: `pnpm typecheck`

Expected: PASS.

```bash
git add src/engine/cognitive-standardized
git commit -m "feat: add standardized cognitive engine contracts"
```

### Task 2: Supabase 스키마·최소 권한·RLS 테스트를 작성한다

**Files:**
- Create: `supabase/migrations/20260828000000_cognitive_pilot.sql`
- Create: `supabase/tests/cognitive_pilot_rls.test.sql`
- Create: `src/types/database.ts`
- Test: `supabase/tests/cognitive_pilot_rls.test.sql`

**Interfaces:**
- Produces: `public.assessment_runs`, `public.assessment_results`, `public.research_consents`와 비공개 `private_cognitive` 스키마.
- Consumes: `auth.uid()`와 익명 Auth의 authenticated 역할.

- [ ] **Step 1: RLS 허용·차단 SQL 테스트를 먼저 작성한다.**

```sql
begin;
select plan(6);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test');

insert into public.assessment_runs (id, owner_id, assessment_key, status, item_bank_version, algorithm_version)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'cognitive_v1', 'active', 'pilot-v1', 'cat-v1');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select results_eq(
  $$ select id from public.assessment_runs order by id $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$,
  'owner reads own run'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select is_empty($$ select id from public.assessment_runs $$, 'other user reads no owner run');
rollback;
```

The test suite must also assert that `anon` has no table grant, an authenticated user cannot insert a row for another `owner_id`, and neither client role can select from `private_cognitive`.

- [ ] **Step 2: 테스트가 마이그레이션 부재로 실패함을 확인한다.**

Run only after a human approves local migration execution: `supabase test db`

Expected: FAIL because the cognitive tables and policies do not exist.

- [ ] **Step 3: 스키마와 권한을 한 마이그레이션에 작성한다.**

```sql
create schema if not exists private_cognitive;
revoke all on schema private_cognitive from anon, authenticated;

create table public.assessment_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  assessment_key text not null check (assessment_key = 'cognitive_v1'),
  status text not null check (status in ('active', 'paused', 'completed', 'invalid')),
  item_bank_version text not null,
  algorithm_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assessment_runs enable row level security;
revoke all on public.assessment_runs from anon, authenticated;
grant select, insert on public.assessment_runs to authenticated;
create policy "owners read own runs" on public.assessment_runs for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners create own runs" on public.assessment_runs for insert to authenticated
  with check ((select auth.uid()) = owner_id);
```

Create `public.assessment_results` and `public.research_consents` with the same direct owner predicate. Create private tables for item versions, answer keys, run assignments, raw responses, scoring state, and audit events; grant them to neither `anon` nor `authenticated`.

- [ ] **Step 4: 정답·보정값을 반환하지 않는 RPC 경계를 추가한다.**

`private_cognitive.submit_response` must take `run_id`, `assignment_id`, and `option_id`; it checks `auth.uid()` owns the public run, confirms the assignment is current and unanswered, records only the submitted option in the private schema, and returns `{ run_id, status, next_assignment_id }`. Mark every security-definer function with `set search_path = ''`, schema-qualify objects, revoke public execute, and grant execute only to `authenticated` where a user-bound RPC is necessary.

- [ ] **Step 5: 생성 타입·RLS 테스트를 확인하고 커밋한다.**

Run only after human approval: `supabase gen types typescript --local --schema public > src/types/database.ts`

Run only after human approval: `supabase test db`

Expected: PASS for owner access and all deny cases.

```bash
git add supabase src/types/database.ts
git commit -m "feat: add cognitive pilot schema and rls"
```

### Task 3: Supabase 클라이언트와 서버 전용 DAL을 만든다

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/server/cognitive/auth.ts`
- Create: `src/server/cognitive/repository.ts`
- Test: `src/server/cognitive/__tests__/repository.test.ts`

**Interfaces:**
- Consumes: `Database` from `src/types/database.ts`, `ItemPresentation` from Task 1, RLS tables/RPC from Task 2.
- Produces: `requireCognitiveSubject()`, `getOwnedRun()`, `getPresentationForOwner()`, `submitOwnedResponse()`.

- [ ] **Step 1: DAL이 비공개 필드를 DTO로 내보내지 않는 실패 테스트를 작성한다.**

```ts
it("maps an assignment to presentation without key or IRT parameters", () => {
  const presentation = toItemPresentation(privateAssignmentFixture);
  expect(presentation).toMatchObject({ assignmentId: "assignment-1", ordinal: 1 });
  expect(presentation).not.toHaveProperty("correctOptionId");
  expect(presentation).not.toHaveProperty("parameters");
  expect(JSON.stringify(presentation)).not.toContain("secret-seed");
});
```

- [ ] **Step 2: 새 테스트가 DAL 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/server/cognitive/__tests__/repository.test.ts`

Expected: FAIL because `repository.ts` does not exist.

- [ ] **Step 3: 공개·서버·관리자 Supabase 클라이언트를 분리한다.**

Install: `pnpm add @supabase/ssr @supabase/supabase-js`

`browser.ts` may read only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `server.ts` uses Next `cookies()` to bind the requester session. `admin.ts` begins with `import "server-only"`, reads `SUPABASE_SERVICE_ROLE_KEY`, throws a configuration error when it is absent, and exports no value usable by a Client Component.

- [ ] **Step 4: 소유권을 매 호출 재검증하는 DAL을 구현한다.**

```ts
import "server-only";

export async function getOwnedRun(runId: string): Promise<OwnedRun | null> {
  const subject = await requireCognitiveSubject();
  const { data } = await createServerSupabaseClient()
    .from("assessment_runs")
    .select("id, status, item_bank_version, algorithm_version")
    .eq("id", runId)
    .eq("owner_id", subject.id)
    .maybeSingle();
  return data ? toOwnedRun(data) : null;
}
```

All action arguments are parsed from `unknown`; malformed UUIDs, impossible option IDs, stale assignments, and non-owners return typed safe errors. The admin client is called only after `getOwnedRun` or an equivalent owner check succeeds.

- [ ] **Step 5: unit tests, typecheck, and focused client-bundle audit pass; then commit.**

Run: `pnpm vitest run src/server/cognitive/__tests__/repository.test.ts`

Run: `pnpm typecheck`

Run: `rg -n "SUPABASE_SERVICE_ROLE_KEY|createAdmin" src/components src/app --glob '*.ts' --glob '*.tsx'`

Expected: tests/typecheck PASS; the final search has no Client Component result.

```bash
git add package.json pnpm-lock.yaml src/lib/supabase src/server/cognitive
git commit -m "feat: add secure cognitive assessment data access"
```

### Task 4: 문항은행 검토 계약과 점수/연습 분리를 구현한다

**Files:**
- Create: `docs/assessment/cognitive-item-authoring.md`
- Create: `src/server/cognitive/itemBank/validation.ts`
- Create: `src/server/cognitive/itemBank/developmentFixture.ts`
- Create: `src/server/cognitive/itemBank/index.ts`
- Create: `src/server/cognitive/practiceItems.ts`
- Test: `src/server/cognitive/itemBank/__tests__/validation.test.ts`
- Test: `src/server/cognitive/__tests__/practiceItems.test.ts`

**Interfaces:**
- Consumes: `InternalItem` from Task 1 and private item schema from Task 2.
- Produces: `validateCalibratedItem`, `loadActiveItem`, `PRACTICE_ITEMS`.

- [ ] **Step 1: active item validation과 연습/점수 ID 중복 방지 테스트를 작성한다.**

```ts
it("rejects a production item without reviewed calibration", () => {
  expect(() => validateCalibratedItem({ ...fixtureItem, status: "pilot", parameters: null })).toThrow(
    "active items require calibrated parameters",
  );
});

it("keeps practice item ids outside the scoring item namespace", () => {
  expect(new Set(PRACTICE_ITEMS.map((item) => item.id)).has("score:gfv1:001")).toBe(false);
});
```

- [ ] **Step 2: 테스트가 실패함을 확인한다.**

Run: `pnpm vitest run src/server/cognitive/itemBank/__tests__/validation.test.ts src/server/cognitive/__tests__/practiceItems.test.ts`

Expected: FAIL because the item-bank modules do not exist.

- [ ] **Step 3: 원작성·검토 문서를 작성하고 상태 검증기를 구현한다.**

The authoring document must require construct tag, Korean source text, English translation status, distractor rationale, answer evidence, visual accessibility check, two independent expert reviews, cognitive-interview record, copyright provenance, and retire reason. `validateCalibratedItem` rejects missing calibration, invalid 2PL/3PL bounds, duplicate option IDs, a correct option absent from options, and production status before expert review.

- [ ] **Step 4: 개발 fixture와 연습은행을 안전하게 분리한다.**

`developmentFixture.ts` is imported only by test code and never by an active-production loader. `practiceItems.ts` contains independently authored tutorial items whose answer and explanation are intentionally public. `loadActiveItem` reads only server-side private rows whose status is `active`, item-bank version matches the run snapshot, and calibration version matches the selection algorithm.

- [ ] **Step 5: item-bank tests를 통과시키고 커밋한다.**

Run: `pnpm vitest run src/server/cognitive/itemBank src/server/cognitive/__tests__/practiceItems.test.ts`

Expected: PASS.

```bash
git add docs/assessment src/server/cognitive/itemBank src/server/cognitive/practiceItems.ts
git commit -m "feat: define cognitive item bank review boundary"
```

### Task 5: 이해하기 쉬운 벡터 그림 자극과 연습 UI를 구축한다

**Files:**
- Create: `src/components/cognitive/figures/contracts.ts`
- Create: `src/components/cognitive/figures/MatrixBoard.tsx`
- Create: `src/components/cognitive/figures/SpatialSolid.tsx`
- Create: `src/components/cognitive/figures/OptionFigure.tsx`
- Create: `src/components/cognitive/PracticeForm.tsx`
- Modify: `src/components/cognitive/ItemStimulus.tsx`
- Test: `src/components/cognitive/__tests__/figures.dom.test.tsx`
- Test: `src/components/cognitive/__tests__/practiceForm.dom.test.tsx`

**Interfaces:**
- Consumes: visual `CognitiveStimulus` from Task 1 and `PRACTICE_ITEMS` from Task 4.
- Produces: accessible `role="img"` SVG and a public-explanation practice route component.

- [ ] **Step 1: 도형의 접근성·비색상 구분 테스트를 작성한다.**

```tsx
render(<MatrixBoard figure={matrixFixture} label="3×3 도형 행렬, 빈칸 하나" />);
expect(screen.getByRole("img", { name: "3×3 도형 행렬, 빈칸 하나" })).toBeVisible();
expect(document.querySelectorAll("pattern, [stroke-dasharray]").length).toBeGreaterThan(0);
```

```tsx
render(<PracticeForm items={PRACTICE_ITEMS} locale="ko" />);
expect(screen.getByRole("button", { name: "해설 보기" })).toBeDisabled();
```

- [ ] **Step 2: 새 UI 테스트가 모듈 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/components/cognitive/__tests__/figures.dom.test.tsx src/components/cognitive/__tests__/practiceForm.dom.test.tsx`

Expected: FAIL because the new figure and practice components do not exist.

- [ ] **Step 3: 선언형 SVG 렌더러를 구현한다.**

Each SVG has a localized non-answer-revealing `title`, `role="img"`, fixed viewBox, high-contrast `currentColor` strokes, geometry/pattern differences that work without hue, and stable `idPrefix` values. `SpatialSolid` renders connected cubes with a fixed isometric projection and never uses an artistic raster image as test evidence.

- [ ] **Step 4: 연습 폼에서만 정답·해설을 공개한다.**

`PracticeForm` keeps answer selection in Client Component state. It reveals `explanationKo` or `explanationEn` only after the user submits that independent practice item. `ItemStimulus` continues to render generic text/figure data but accepts only the public `ItemPresentation` shape for scored runs.

- [ ] **Step 5: DOM tests와 키보드 회귀를 통과시키고 커밋한다.**

Run: `pnpm vitest run src/components/cognitive/__tests__/figures.dom.test.tsx src/components/cognitive/__tests__/practiceForm.dom.test.tsx`

Expected: PASS; each option remains reachable by keyboard and no test depends on color alone.

```bash
git add src/components/cognitive
git commit -m "feat: add accessible cognitive figure and practice ui"
```

### Task 6: 실행 라이프사이클과 Server Action 보안 경계를 구현한다

**Files:**
- Create: `src/server/cognitive/runs.ts`
- Create: `src/app/cognitive/actions.ts`
- Create: `src/lib/cognitiveRunInput.ts`
- Test: `src/server/cognitive/__tests__/runs.test.ts`
- Test: `src/lib/__tests__/cognitiveRunInput.test.ts`

**Interfaces:**
- Consumes: Task 1 selection/scoring, Task 3 DAL, Task 4 active item loader.
- Produces: `startCognitiveRun`, `submitCognitiveResponse`, `resumeCognitiveRun`, `parseRunId`, `parseResponseInput`.

- [ ] **Step 1: stale assignment·non-owner·invalid option 실패 테스트를 작성한다.**

```ts
it("does not advance when an old assignment is submitted", async () => {
  await expect(submitCognitiveResponse(fixtureSubject, staleSubmission)).resolves.toEqual(
    expect.objectContaining({ error: "stale_assignment" }),
  );
});

it("rejects a response with an option not presented to the run", () => {
  expect(() => parseResponseInput({ runId: RUN_ID, assignmentId: ASSIGNMENT_ID, optionId: "hidden" })).toThrow(
    "invalid option id",
  );
});
```

- [ ] **Step 2: 테스트가 실행 서비스 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/server/cognitive/__tests__/runs.test.ts src/lib/__tests__/cognitiveRunInput.test.ts`

Expected: FAIL because the run service and input parser do not exist.

- [ ] **Step 3: 서버에서만 실행을 시작하고 다음 문항을 배정한다.**

```ts
export async function startCognitiveRun(input: StartRunInput): Promise<RunSnapshot> {
  const subject = await requireCognitiveSubject();
  const run = await createOwnedRun({
    ownerId: subject.id,
    assessmentKey: "cognitive_v1",
    consent: input.consent,
  });
  return assignNextPresentation(run, subject.id);
}
```

The service creates a cryptographically random server seed, persists it only in private state, selects the first eligible item, and writes a single assignment transaction. It never accepts a client-provided theta, score, correct flag, item ID, or seed.

- [ ] **Step 4: 얇은 Server Actions를 구현하고 매 호출 소유권을 검증한다.**

```ts
"use server";

export async function submitCognitiveResponseAction(input: unknown): Promise<SubmissionResult> {
  const parsed = parseResponseInput(input);
  return submitCognitiveResponse(parsed);
}
```

Each action invokes `requireCognitiveSubject` through the service, validates the run UUID and assignment/option IDs, checks owner plus active status, and returns only `SubmissionResult`. It does not return private record rows or closed-over sensitive values.

- [ ] **Step 5: race-condition tests and focused checks pass; then commit.**

Run: `pnpm vitest run src/server/cognitive/__tests__/runs.test.ts src/lib/__tests__/cognitiveRunInput.test.ts`

Expected: PASS; a duplicate submission has one persisted response and one typed stale result.

```bash
git add src/server/cognitive/runs.ts src/app/cognitive/actions.ts src/lib/cognitiveRunInput.ts src/server/cognitive/__tests__ src/lib/__tests__/cognitiveRunInput.test.ts
git commit -m "feat: add protected cognitive run lifecycle"
```

### Task 7: 파일럿 검사·재개·보류 결과 화면으로 교체한다

**Files:**
- Modify: `src/app/cognitive/page.tsx`
- Create: `src/app/cognitive/run/[runId]/page.tsx`
- Create: `src/app/cognitive/result/[runId]/page.tsx`
- Create: `src/components/cognitive/StandardizedRunClient.tsx`
- Create: `src/components/cognitive/PilotResult.tsx`
- Modify: `src/app/cognitive/result/page.tsx`
- Modify: `src/lib/analysisCatalog.ts`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Test: `src/components/cognitive/__tests__/standardizedRunClient.dom.test.tsx`

**Interfaces:**
- Consumes: `RunSnapshot` and `SubmissionResult` from Tasks 1 and 6; figure components from Task 5.
- Produces: `/cognitive/run/[runId]`, `/cognitive/result/[runId]`, and a legacy-safe response for old `?r=` links.

- [ ] **Step 1: 파일럿 결과가 IQ와 정답 해설을 출력하지 않는 DOM 테스트를 작성한다.**

```tsx
render(<PilotResult result={{ status: "pilot_withheld", score: null }} locale="ko" />);
expect(screen.getByText("연구 참여가 기록되었습니다")).toBeVisible();
expect(screen.queryByText(/IQ|백분위|정답|해설/)).toBeNull();
```

- [ ] **Step 2: 새 화면 테스트가 컴포넌트 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/components/cognitive/__tests__/standardizedRunClient.dom.test.tsx`

Expected: FAIL because the standardized client and pilot result components do not exist.

- [ ] **Step 3: Server/Client 경계를 명시한 새 경로를 구현한다.**

`/cognitive/run/[runId]/page.tsx` and `/cognitive/result/[runId]/page.tsx` remain Server Components, set dynamic rendering for anonymous-auth-specific data, validate `params.runId`, call the Task 3 DAL, and render a restart/recovery page for non-owners. `StandardizedRunClient.tsx` begins with `"use client"`; it receives only `RunSnapshot`, calls Task 6 actions, and renders no hidden answer data.

- [ ] **Step 4: 기존 탐색 URL과 공유 경계를 안전하게 전환한다.**

`/cognitive` becomes the standardized landing page with eligibility, device, pilot, and non-clinical notices plus a separate `/cognitive/practice` link. Existing `/cognitive/result?r=` stays a legacy read-only notice that never creates a standardized score or new share. Keep `src/lib/shareCode.ts` and `/s/cognitive/*` only as legacy summary readers; remove every new cognitive `ShareBar` emission.

- [ ] **Step 5: 메시지 동기화와 DOM 테스트를 통과시키고 커밋한다.**

Run: `pnpm vitest run src/components/cognitive/__tests__/standardizedRunClient.dom.test.tsx src/i18n/__tests__/messages.test.ts`

Expected: PASS; Korean and English key/placeholder parity holds.

```bash
git add src/app/cognitive src/components/cognitive src/lib/analysisCatalog.ts messages
git commit -m "feat: add pilot cognitive assessment flow"
```

### Task 8: 연구 동의·장치 적격성·중단 복구를 추가한다

**Files:**
- Create: `src/lib/cognitiveEligibility.ts`
- Create: `src/components/cognitive/ResearchConsent.tsx`
- Create: `src/components/cognitive/DeviceCheck.tsx`
- Modify: `src/server/cognitive/runs.ts`
- Modify: `src/app/cognitive/actions.ts`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Test: `src/lib/__tests__/cognitiveEligibility.test.ts`
- Test: `src/components/cognitive/__tests__/researchConsent.dom.test.tsx`

**Interfaces:**
- Consumes: Task 2 consent table and Task 6 run service.
- Produces: `evaluateEligibility`, `ConsentChoice`, `startCognitiveRun({ consent })`.

- [ ] **Step 1: 적격성·동의 독립성 테스트를 작성한다.**

```ts
expect(evaluateEligibility({ locale: "ko", device: "mobile", keyboard: false })).toEqual({
  eligibleForGs: false,
  eligibleForComposite: false,
  reason: "unsupported_input_device",
});
```

```tsx
render(<ResearchConsent onContinue={onContinue} />);
await user.click(screen.getByLabelText("운영 결과 저장에는 동의합니다"));
await user.click(screen.getByRole("button", { name: "계속" }));
expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ researchParticipation: false }));
```

- [ ] **Step 2: 테스트가 적격성/동의 모듈 부재로 실패함을 확인한다.**

Run: `pnpm vitest run src/lib/__tests__/cognitiveEligibility.test.ts src/components/cognitive/__tests__/researchConsent.dom.test.tsx`

Expected: FAIL because the eligibility and consent modules do not exist.

- [ ] **Step 3: 최소 수집 적격성 모델을 구현한다.**

`evaluateEligibility` consumes an explicit `DeviceCapability` object rather than browser globals, classifies only the standardized conditions required by the current protocol, and never labels a person as low ability. Extend `startCognitiveRun` to evaluate `input.capability` before `createOwnedRun`, persist the resulting eligibility reason with the run, and set `pilot_withheld` when any required condition is false.

- [ ] **Step 4: 운영 결과와 연구 참여 동의를 분리한다.**

`ResearchConsent` has separate unchecked controls for required operational storage and optional research use. It constructs the `StartRunInput.consent` value only after the explicit choice. The server action persists consent version, timestamp, and the smallest allowed attribute set only after the explicit choice. Withdrawal changes consent state; it does not expose another participant's research data or mutate final aggregate outputs.

- [ ] **Step 5: 동의·적격성 테스트를 통과시키고 커밋한다.**

Run: `pnpm vitest run src/lib/__tests__/cognitiveEligibility.test.ts src/components/cognitive/__tests__/researchConsent.dom.test.tsx`

Expected: PASS.

```bash
git add src/lib/cognitiveEligibility.ts src/components/cognitive src/server/cognitive src/app/cognitive/actions.ts messages
git commit -m "feat: add cognitive consent and eligibility checks"
```

### Task 9: 보안·접근성·다른 출제 실행을 E2E로 고정한다

**Files:**
- Create: `e2e/cognitive-standardized.spec.ts`
- Create: `e2e/cognitive-security.spec.ts`
- Modify: `e2e/helpers.ts`
- Test: `e2e/cognitive-standardized.spec.ts`
- Test: `e2e/cognitive-security.spec.ts`

**Interfaces:**
- Consumes: Task 7 routes and Task 8 consent flow.
- Produces: standardized-pilot regression coverage.

- [ ] **Step 1: 새 실행 두 개의 청사진 충족·서로 다른 문항 E2E를 작성한다.**

```ts
const firstRun = await startEligibleRun(page);
const secondRun = await startEligibleRun(secondPage);
expect(firstRun.itemIds).not.toEqual(secondRun.itemIds);
expect(firstRun.domains).toContain("gf");
expect(firstRun.domains).toContain("gc");
expect(firstRun.domains).toContain("gv");
expect(firstRun.domains).toContain("gwm");
expect(firstRun.domains).toContain("gs");
```

Use server-controlled test fixtures with distinct seeds; do not assert probabilistic production randomness.

- [ ] **Step 2: 정답·원응답 비노출 보안 E2E를 작성한다.**

```ts
await expect(page).not.toHaveURL(/\?(?:.*(?:answer|response|theta|seed)=)/);
await expect(page.locator("body")).not.toContainText("correctOptionId");
const scripts = await page.locator("script").allTextContents();
expect(scripts.join("\n")).not.toContain("correctOptionId");
```

- [ ] **Step 3: 새 E2E가 경로 부재로 실패함을 확인한다.**

Run: `pnpm playwright test e2e/cognitive-standardized.spec.ts e2e/cognitive-security.spec.ts --workers=1`

Expected: FAIL until Tasks 2–8 are implemented and a local approved Supabase test environment is configured.

- [ ] **Step 4: 복구·접근성 시나리오를 추가한다.**

Assert owner run resume after reload, other anonymous subject gets a non-enumerating recovery page, keyboard selection is visible, vector figures have localized names, reduced motion does not hide essential content, and ineligible device result has no IQ/percentile text.

- [ ] **Step 5: 전체 자동 검증을 통과시키고 커밋한다.**

Run: `pnpm typecheck`

Run: `pnpm lint`

Run: `pnpm test`

Run: `pnpm playwright test e2e/cognitive-standardized.spec.ts e2e/cognitive-security.spec.ts --workers=1`

Run: `pnpm build`

Expected: all commands PASS before a pilot deployment is considered.

```bash
git add e2e
git commit -m "test: cover cognitive pilot security and accessibility"
```

### Task 10: 파일럿 운영 문서와 공개 차단을 최종 확인한다

**Files:**
- Create: `docs/assessment/cognitive-pilot-operations.md`
- Modify: `src/engine/cognitive-standardized/scoring.ts`
- Modify: `src/lib/analysisCatalog.ts`
- Test: `src/engine/cognitive-standardized/__tests__/scoring.test.ts`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: pilot launch checklist and a code-level assertion that production score release is disabled until the score-release plan creates an independently approved norm registry entry.

- [ ] **Step 1: 점수 공개 차단 테스트를 작성한다.**

```ts
it("cannot emit a standardized score without an approved norm version", () => {
  expect(() => scoreRun({ ...fixtureInput, releaseMode: "standardized", normVersion: null })).toThrow(
    "approved norm version is required",
  );
});
```

- [ ] **Step 2: 테스트가 실패함을 확인한다.**

Run: `pnpm vitest run src/engine/cognitive-standardized/__tests__/scoring.test.ts`

Expected: FAIL until the release guard is enforced.

- [ ] **Step 3: 파일럿 운영 문서를 작성한다.**

Document recruitment invite control, support and withdrawal route, incident escalation, device eligibility copy, data minimization, no-IQ public copy, active item exposure review, RLS test evidence, and the exact human approvals required for migration execution, research export, data collection, and score release.

- [ ] **Step 4: release guard와 evidence status를 구현한다.**

The scoring engine requires a server-loaded `approved` norm version to create `standardized_scored`. `analysisCatalog` remains `experimental` throughout the pilot and does not claim target-population validation.

- [ ] **Step 5: focused/full tests pass and commit.**

Run: `pnpm vitest run src/engine/cognitive-standardized/__tests__/scoring.test.ts`

Run: `pnpm typecheck && pnpm lint && pnpm test`

Expected: PASS.

```bash
git add docs/assessment src/engine/cognitive-standardized/scoring.ts src/lib/analysisCatalog.ts
git commit -m "docs: define cognitive pilot release safeguards"
```

## Phase-A Acceptance Criteria

- An anonymous authenticated subject can start, pause, resume, and complete only its own pilot run.
- Two deterministic test runs demonstrate different eligible item sets while each meets its full domain blueprint.
- No URL, shared page, browser payload, Client Component prop, or client-accessible table exposes answer keys, IRT parameters, seeds, or raw responses.
- Every point-score path returns `pilot_withheld` without an approved norm version.
- Practice items are visually comparable but structurally separated from score items and alone reveal explanations.
- Local migration execution, production deployment, participant recruitment, raw-data export, and IQ release remain blocked until separately approved.
