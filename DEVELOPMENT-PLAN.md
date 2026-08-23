# LUMINA 상용화 고도화 계획

> 작성일: 2026-08-20 · 상태: 핵심 구현 완료 · 외부 운영 설정·법률 검토·백업은 별도 진행
>
> 이 문서는 초기 실행 순서를 보존한 계획서다. 현재 구현 상태는 Phase 0~6의 코드·검증 항목과
> Phase 5 궁합·연간운까지 반영되어 있으며, Phase 7의 실제 계정·동의 플랫폼·법률 확정은
> 운영자 권한과 외부 승인이 필요한 항목으로 남아 있다.

## Context

LUMINA는 동서양 성향·운세 분석 플랫폼이다. 현재 사주·서양점성술·타로·운세·수비학·성향검사·캐릭터·궁합·공용으로 9개 도메인 모듈이 구현돼 있고, 코드 위생은 매우 좋다 — `any` 0건, `TODO` 0건, `eslint-disable` 0건, `strict` + `noUncheckedIndexedAccess`, 사주는 `lunar-javascript` 대비 436케이스 100% 일치, 점성술은 `astronomia`(VSOP87) 대비 0.05° 이내로 교차검증된다.

문제는 **완성된 계산 엔진과 상용 서비스 사이의 간극**이다. 저장소에는 커밋이 1개뿐이고 제품 전체(126개 TS 파일)가 미커밋·미백업 상태다. 400MB의 미최적화 PNG가 그대로 서빙되고, `ads.txt`는 전 줄이 주석 처리돼 무효이며, 영어 페이지는 검색엔진에 존재하지 않는다. 가장 얕은 엔진(오늘의 운세)이 하필 유일하게 색인 가능한 면이다.

이 계획의 목표는 두 가지다. (1) 광고 기반 상용 서비스가 성립하기 위한 최소 요건을 갖추고, (2) 이미 정확한 계산 위에 **실제로 읽을 가치가 있는 제품 깊이**를 얹는다.

### 확정된 방향

| 항목 | 결정 |
|---|---|
| 수익 모델 | 광고(AdSense) 중심 |
| 백엔드 | 도입하지 않음. 무상태·프라이버시 우선 구조 유지, 최소 서버 기능만 |
| 타깃 | ko / en 동등 |
| 우선순위 | 제품 깊이 우선 |
| i18n URL | `localePrefix: "as-needed"` — ko는 루트, en은 `/en/` |
| 이미지 자산 | AVIF/WebP 재인코딩 후 저장소 커밋 (sharp 활성화) |
| 깊이 범위 | 운세 실근거화 + 기능 간 연결 + 해석 깊이 + 신규 기능(궁합·연간운) 전부 |

### 반드시 지켜야 할 기존 설계 계약

이 계획의 모든 작업은 아래를 깨뜨리지 않는다. 이건 이 코드베이스의 자산이지 부채가 아니다.

1. **엔진은 순수 함수다.** React/DOM 의존 없음, 반환값 `Object.freeze`.
2. **엔진은 시계를 읽지 않는다.** 시간 의존 출력은 호출부가 `referenceDate`/`date`/`seed`를 주입한다 — 공유 링크가 몇 달 뒤에도 같은 결과를 재현해야 하기 때문.
3. **엔진은 로케일을 모른다.** ko/en 문자열 *쌍*을 데이터로 들고, 문장 조립은 `src/lib/*Model.ts` 뷰모델과 서버 컴포넌트가 한다.
4. **서버에 개인정보를 저장하지 않는다.** 상태는 `localStorage`와 LZString URL 페이로드에만 존재한다 (`src/lib/profile.ts`, `src/lib/share.ts`).
5. **3계층 신뢰도 프레임워크**(`src/engine/shared/tier.ts`) — 모든 산출물은 `scientific`/`cultural`/`entertainment` 중 하나로 태깅되고 계층 간 산술 합성을 하지 않는다.

---

## Phase 0 — 안전망과 테스트 인프라 (선행 필수)

> 이 Phase 전에는 다른 어떤 작업도 시작하지 않는다. 지금 디스크가 죽으면 제품 전체가 사라진다.

### 0-1. 형상관리 복구

- 미커밋 40개 항목을 의미 단위로 나눠 커밋한다 (엔진 / 뷰모델 / 컴포넌트 / 라우트 / i18n / e2e / 자산 / 설정).
- **주의**: `public/` 400MB를 그대로 커밋하면 git 히스토리에 영구히 남는다. **자산을 제외한 코드부터 먼저 커밋**하고, 자산은 Phase 1의 재인코딩 결과물을 커밋한다.
- `.gitignore`에 `test-results/`, `playwright-report/` 추가 (현재 추적 대상으로 잡힌다).
- 원격 저장소 생성 및 푸시 — **사용자 확인 후 실행** (되돌릴 수 없는 외부 전송).

### 0-2. CI 파이프라인

`.github/workflows/ci.yml` 신규. `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build` → `pnpm test:e2e`. 현재 `.github/`가 아예 없다.

### 0-3. 테스트 인프라 확장

현재 `vitest.config.ts`의 세 가지 제약이 이후 모든 작업의 검증을 막는다:

- `include: ["src/**/*.test.ts"]` → `.tsx`가 매칭되지 않아 **컴포넌트 테스트가 원천 불가**.
- `coverage.include: ["src/engine/**/*.ts"]` → `src/lib` 1187 LOC가 커버리지에 **아예 나타나지 않는다** (0%가 아니라 부재).
- 커버리지 **임계값 없음** → CI가 회귀를 잡을 수 없다.

변경:
- `environment: "node"`는 엔진 테스트 속도를 위해 유지하고, `.tsx`용 `jsdom` 프로젝트를 분리 추가.
- `coverage.include`에 `src/lib/**/*.ts` 편입.
- `thresholds` 설정. 엔진은 현 수준(statements 95 / branches 90)을 바닥으로 고정, lib은 백필 후 상향.

### 0-4. `src/lib` 테스트 백필

가장 위험한 경계다. `src/lib/share.ts:50` `decodeProfile`은 **신뢰할 수 없는 URL 입력을 파싱**하며 모든 공유 링크가 이를 통과한다. 현재 왕복·레거시 12필드·고정 현재 포맷·손상 입력 경계 테스트가 `src/lib/__tests__/share.test.ts`에 있다.

- `share.ts` — 라운드트립, 12필드 길이 위반, 타입 위반, 손상된 LZString, 빈 문자열, 좌표 반올림 경계.
- `psychometricsCode.ts` — `/^[1-5]{50}$/` 경계.
- `reportModel.ts` — `buildNotes` 6종 union, `buildTenGodGroups`.
- `horoscopeModel.ts` — ko 문구 인덱스를 역추적해 en 짝을 찾는 로직. 문구 구조가 Phase 2에서 바뀌므로 지금 동작을 고정해둔다.

**검증**: `pnpm test:cov`에서 `src/lib`가 리포트에 나타나고 임계 통과. CI 녹색.

---

## Phase 1 — 자산 파이프라인과 성능

광고 모델에서 성능은 곧 매출이다. 그리고 켈틱크로스 스프레드에서 카드 10장 = 34MB는 성능 문제 이전에 **제품 결함**이다.

### 1-1. sharp 활성화

`pnpm-workspace.yaml`의 `sharp: false` → `true`. 현재 Next 이미지 최적화기에 네이티브 백엔드가 없다.

### 1-2. 자산 재인코딩

- 원본 PNG 119장(399MB, 타로 카드 평균 3.4MB)을 실제 렌더 크기 기준으로 리사이즈 후 AVIF(+WebP 폴백) 재인코딩. 목표 20~40MB.
- 원본은 저장소 밖 별도 보관. 보관 위치를 사용자에게 안내한다.
- 재인코딩 스크립트를 `scripts/`에 남겨 재현 가능하게 한다.

### 1-3. 이미지 렌더링 경로 정비

- `next.config.ts`에 `images` 설정 추가 (현재 `next-intl` 플러그인 래핑만 있는 빈 설정).
- 파일 경로를 만드는 6곳이 확장자를 알아야 한다: `src/lib/reportModel.ts:267`, `src/lib/horoscopeModel.ts:69`, `src/lib/tarotModel.ts:69`, `src/lib/psychometricsModel.ts:49`, `src/lib/numerologyModel.ts:48`, `src/components/horoscope/SignPicker.tsx:52`. 확장자를 각 뷰모델에 하드코딩하지 말고 상수 한 곳으로 모은다.
- 켈틱크로스처럼 카드가 많은 화면은 첫 화면 밖 카드에 `loading="lazy"`, 대표 카드만 `priority`.

### 1-4. `metadataBase`와 OG 이미지 외부 의존 제거

- `src/app/layout.tsx`의 `generateMetadata`에 `metadataBase`가 없어 OG 이미지 절대경로가 깨진다.
- `src/app/r/[data]/opengraph-image.tsx`가 렌더마다 `fonts.googleapis.com`에 실제 fetch를 2회 한다. 폰트를 로컬 자산으로 내려 런타임 외부 의존을 없앤다.

**검증**: 모바일 Lighthouse LCP < 2.5s, CLS < 0.1. 켈틱크로스 페이지 총 전송량 5MB 이하. `pnpm build` 통과, e2e 전체 녹색.

---

## Phase 2 — 제품 깊이 A: 운세 엔진 실근거화

이번 고도화의 핵심이자 가장 큰 작업이다. 현재 `src/engine/horoscope/index.ts:76`은 `rngFromSeed()`로 시드를 만들어 `phrases.ts`의 평면 배열 4개에서 `pick()`할 뿐 — **난수가 의미를 고르고 있어서 계산 근거가 없다.** 하필 이 페이지가 앱 전체에서 유일하게 색인 가능한 면(12궁 × 2체계 = 24면)이다.

### 2-0. 왜 지금 고쳐야 하는가 — 고지문이 이미 답을 정해뒀다

확인된 사실: `messages/ko.json`의 `common.disclaimerCultural`은 이미 "계산 자체는 정해진 규칙(**절기·천체 위치**·셔플 알고리즘 등)을 따르지만 … 예측한다는 주장은 경험적으로 확인되지 않았습니다"라고 쓰여 있다. 반면 `disclaimerEntertainment`는 "정해진 **문장 은행**에서 … 실제 천체 위치나 개인 데이터를 바탕으로 하지 않으며"라고 명시한다.

즉 **작업 결과물을 정확히 서술하는 고지문이 이미 `cultural` 쪽에 존재한다.** 카피를 한 글자도 고치지 않고 정직해지는 쪽이 승격이다.

### 2-1. 설계 원칙: 프록시 금지 — 정확히 계산 가능한 것만 낸다

가장 먼저 기각한 유혹은 "별자리 중점을 가짜 출생 태양으로 쓰기"다. 사자자리는 황경 120°~150° 구간이라 중점 135°는 최대 ±15° 오차 — `ASPECTS`의 최대 orb 8°보다 크다. 계산은 진짜인데 결론은 여전히 근거 없는 "정밀해 보이는 거짓"이 되어 지금보다 나쁘다.

대신 **whole-sign(30° 버킷) 관계만** 쓴다. 근사가 아니라 정의상 정확하다:

| 얕은 페이지에서 정확히 참인 것 | 재사용 함수 |
|---|---|
| 화성이 지금 물병자리 → 사자와 대치궁 | `signOfLongitude(planetPosition("mars", t).longitude)` |
| 수성이 역행 중 | `planetPosition("mercury", t).retrograde` |
| 달 위상 | `norm360(moonLon − sunLon)` |
| 오늘 일진이 甲子일 | `dayPillarFromJDN(gregorianToJDN(y,m,d))` |
| 오늘 일지(子)와 내 띠(午)는 **충** | 지지 index 차 6 — 닫힌 형식 |

**띠 페이지가 특히 강하다. 띠 = 지지 그 자체**이므로 오늘 일지와의 관계는 프록시가 아니라 완전한 정보다.

### 2-2. URL 설계 — 얕은 색인 면과 깊은 개인화 면의 분리

```
[얕음 · 색인 O · 개인정보 0]
/horoscope/zodiac/leo          경로 불변 (이미 나간 링크 보존)
  ?d=YYYY-MM-DD                기존 TodaySync 규약 유지
  + alternates.canonical       ← 신규, 필수 (없으면 날짜마다 색인 폭발)

[깊음 · noindex · 프로필 필요]
/r/[data]/today                신규. /r/[data]/astro 의 형제
```

`/r/[data]/today`를 고른 이유: `[data]`가 `share.ts`의 `encodeProfile`로 이미 완전한 프로필을 담으므로 **새 인코딩·새 디코드 경로·새 프라이버시 표면을 만들지 않는다.** `/r/[data]/astro/page.tsx:41`이 이미 `robots: { index: false, follow: false }` 규약을 세워뒀고, `ReportHeader`(같은 파일 310행)에 탭 2개가 있어 3번째 추가가 자연스럽다.

**기각**: `/horoscope/zodiac/leo?p=<encoded>` — 색인 가능한 URL에 개인 페이로드를 섞으면 "색인 가능 = 비개인" 불변식이 깨진다.

**localStorage 브리지는 링크만, 리다이렉트 금지.** 신규 `PersonalizeCta.tsx`가 `useSyncExternalStore(subscribeProfile, …)`로 프로필 유무를 보고 링크만 바꾼다. 유일한 색인 페이지에 자동 replace를 걸면 크롤러가 오염되고, "사자자리"를 일부러 누른 사용자를 개인 리포트로 납치하는 셈이 된다.

### 2-3. 모듈 구조

순환 의존 없음을 확인했다 (`horoscope → {astro, saju, shared}` 단방향; saju/astro 어느 쪽도 horoscope를 import하지 않음).

**단, 배럴이 아니라 서브모듈에서 직접 import한다.** `@engine/saju` 배럴은 `lunar.ts`(korean-lunar-calendar)·`luck.ts`·`solarTerms.ts`를 전부 재수출하므로, 얕은 페이지 계산 경로에 끌고 들어갈 이유가 없다. `horoscope/constants.ts:1`이 이미 `@engine/astro/constants`를 직접 집는 방식이 올바른 선례다.

```
src/engine/saju/relations.ts        ★신규  지지 관계(충·육합·삼합·형·해) — 엔진 어디에도 없다
src/engine/horoscope/
  sky.ts        ★신규  그날 하늘 (관측자 없음, 전 지구 공통)
  reference.ts  ★신규  (system, signKey, profile?) → 로케일 무관 기준틀
  transit.ts    ★신규  교차 각 (트랜싯 × 출생)
  dayFortune.ts ★신규  일진 + 사용자 일간/띠 관계
  signals.ts    ★신규  Signal 합집합·가중치·랭킹 — 문자열 0개
  lexicon/{aspects,ganji,variants}.ts  ★신규  ko/en 조각
src/components/horoscope/{PersonalizeCta,EvidenceTable}.tsx  ★신규
src/app/r/[data]/today/page.tsx      ★신규
```

`relations.ts`를 `saju/`에 두는 이유: 지지 관계는 명리 코어 도메인이다. `horoscope/`에 두면 계층이 역전된다(horoscope가 소비자).

**재사용 목록 (신규 작성 금지)**: `planetPosition`·`signOfLongitude`·`separationOf`·`ASPECTS`·`norm360` (astro), `dayPillarFromJDN`·`voidBranchesOf`·`twelveStageOf`·`tenGodOf`·`elementRole`·`TEN_GOD_LABEL`(ko/en/한자 짝 이미 있음) (saju), `gregorianToJDN`·`resolveInstant`·`rngFromSeed` (shared).

`computeChart`는 트랜싯에 쓰지 않는다 — `assertValidBirthInput`이 트랜싯 날짜에 출생 검증을 걸고, 관측자 없는 하늘에 하우스를 계산할 이유가 없다. 깊은 페이지의 **출생 차트**에는 당연히 쓴다.
`computeAspects`도 재사용 불가 — 한 배열 내부 i<j 전조합만 돌아 "트랜싯 화성 × 출생 화성" 같은 동일 키 쌍을 못 만든다. `separationOf`만 쓰고 이중 루프는 새로 쓰되 orb 계산식과 "한 쌍은 하나의 각"(break) 규약은 복제한다.

### 2-4. tier 승격 — 양쪽 다 `cultural`

tier는 "계산의 인식론적 발판"을 가리키지 "개인화의 깊이"를 가리키지 않는다. 작업 후 이 엔진은 `astro` 엔진과 **인식론적으로 완전히 같은 상태**가 된다 — 천체 위치는 실제로 계산하고, 그 위치의 의미는 검증되지 않은 전통 관례다. 같은 발판에 다른 라벨을 붙일 근거가 없다.

깊이 차이는 tier가 아니라 구조화된 필드로 표현한다:

```ts
readonly tier: EvidenceTier;                   // 항상 "cultural"
readonly basis: "sign" | "natal";              // 무엇을 나로 삼았는가
readonly precision: "whole-sign" | "degree";   // 각 판정 정밀도
readonly notes: readonly ReadingNote[];        // astroModel의 AstroNote 패턴 그대로
```

**기각한 대안**: "얕음=entertainment / 깊음=cultural" 분리. tier를 프로필 입력 유도용 마케팅 레버로 쓰는 순간 3계층 프레임워크가 훼손되고, 얕은 페이지도 실제 천체 위치를 쓰므로 `entertainment` 고지문이 여전히 거짓이다.

**함께 고쳐야 할 하드코딩 6곳**: `horoscope/index.ts:80`, `app/horoscope/[system]/[sign]/page.tsx:97,141`, `app/horoscope/page.tsx:30,53`, `components/home/FeatureHub.tsx`, `__tests__/horoscope.test.ts:81`. 변경 후 앱 전체에서 `entertainment`를 쓰는 화면이 0개가 되므로 `Chrome.tsx:74`의 해당 분기가 죽은 코드가 된다 — 카피와 분기는 남기되 주석으로 표시한다.

### 2-5. 결정론 — 시계를 읽지 않고 트랜싯을 계산하는 법

"날짜 문자열 + 타임존 → 절대 시각"을 엔진 내부 순수 함수로 만든다. 시계를 읽는 게 아니라 인자에서 유도하므로 계약 2번을 위반하지 않는다. `computeSaju`(`saju/index.ts:48`)와 `computeChart`(`astro/index.ts:36`)의 `UNKNOWN_TIME_FALLBACK = { hour: 12, minute: 0 }` 선례를 그대로 따른다 — 달이 하루 13° 움직이므로 오차 최소인 정오를 쓴다.

| 페이지 | timeZone | 근거 |
|---|---|---|
| 얕음 | `"UTC"` 고정 상수 | 프로필이 없어 방문자 위치를 모른다. 서버 시계를 읽지 않는다. `notes`에 `utcNoonReference` 고지 |
| 깊음 | `profile.timeZone` | `share.ts` Packed[10]에 이미 인코딩돼 있음 |

두 경우 모두 엔진 입력이 URL에서 100% 복원된다. 시계를 읽는 지점은 지금과 동일하게 엔진 밖 3곳(`horoscopeModel.ts:87` `utcToday`, 페이지, `TodaySync`)뿐이다.

**성능**: 얕은 페이지는 `force-dynamic`이면서 유일하게 크롤링되는 라우트다. `solarTerms.ts:40`의 `ipchunCache` 패턴을 빌려 `날짜|타임존` 키 모듈 수준 캐시를 둔다 — 얕은 페이지는 키가 날짜뿐이라 히트율이 거의 100%다.

### 2-6. 문구 조립 — 난수의 강등

3층으로 나눈다: **계산층**(문자열 0개) → **신호층**(`Signal[]` + 가중치, 문자열 0개) → **어휘층**(ko/en 짝 데이터).

```ts
// 지금:  난수가 의미를 고른다 → 근거 없음
mood: pick(MOOD_LINES, rng)

// 이후:  계산이 의미를 고르고, 난수는 같은 의미의 문체 변형만 고른다
const top     = rankSignals(signals, "mood")[0];      // 결정론적
const slot    = resolveFragment(top, "mood");          // 결정론적
const variant = pick(VARIANTS[slot.id] ?? [slot], rng); // 난수는 여기서만
```

**조합 폭발 방지 2단 장치**:
1. **인수분해** — 트랜싯 각을 (행성 × 행성 × 각 × 면)으로 열거하면 2,000개다. `actor`(빠른 쪽 10영역) × `tone`(각 → harmonious/tense/fused 3종) + `arena`(느린 쪽 10영역)로 쪼개면 면당 40개, 4면 160개로 300가지 조합을 덮는다.
2. **특수도 우선 폴백 사슬** — `actor.arena.tone.facet`(손으로 쓴 특수 조합 ~30개) → `actor.tone.facet` → `tone.facet`(최후 보루, 반드시 존재). 총 커버리지가 구조적으로 보장된다.

동양 축은 인수분해가 불필요하다(이미 평면이고 작다, ~146개). 전체 어휘 규모는 ko/en 짝 약 300개 — 현재 `phrases.ts` 56개의 5배 남짓으로 손으로 관리 가능하다.

**엔진이 ko/en 짝을 직접 반환한다.** `characters/index.ts`의 `CharacterDef`(`name`/`nameEn`) 선례를 따른다. 이걸로 `src/lib/horoscopeModel.ts:52`의 `koLines.indexOf(picked)` 역추적이 사라진다 — 뷰모델은 `locale === "en" ? line.en : line.ko`만 하면 된다.

**근거를 화면에 노출한다.** `EvidenceTable.tsx`가 `reading.evidence`를 표로 그린다 (달 위치 / 일진 / 지지 관계 / 역행 여부). `resolveSajuCharacter`의 `source`("어떤 값에서 나왔는지 — 화면에 근거로 함께 보인다")와 같은 규율이다. **이 표 없이 tier만 올리면 자기 선언에 불과하다.**

### 2-7. 테스트 — 오라클 있는 층과 없는 층을 분리

**A. 계산층 — 외부 오라클이 전부 존재한다**
- **일진 전수 스윕**: `lunar-javascript`의 `getDayInGanZhi()` 대비 1900-01-01~2100-12-31 **73,414일 100% 일치**. 일주는 순수 JDN 60주기라 시각·타임존이 개입하지 않아 전수 비교가 가능하다. 기존 사주 교차검증(436건)의 168배이고 실행은 몇 초다.
- **트랜싯 황경**: 기존 `astro/__tests__/oracle.ts`의 `oracleLongitude`(astronomia) 재사용. 2020~2030 5일 간격 × 10천체 = 8,030건, 게이트 0.05° 유지.
- **달 위상**: 같은 라이브러리로 검증하면 자기참조다. 삭·망 UTC 발표값 20~30건을 픽스처로 고정, ±2분 게이트.
- **지지 관계**: 오라클 불필요 — 대수적 성질로 증명(충=대합·고정점 없음·궤도 6개, 삼합=12를 4×3 분할, `branchRelationOf` 144조합 전수 대칭성).

**B. 해석층 — 오라클이 없다. 불변식·커버리지·분포로 고정한다**
- **근거 정합 불변식 (핵심 게이트)**: 모든 `line`에 대해 `line.signalId`와 일치하는 `evidence` 항목이 존재해야 한다. 통과하면 "랜덤 뽑기로 회귀"가 구조적으로 불가능해진다.
- **총 커버리지**: 도달 가능한 신호 키 공간 전수 → 비지 않은 ko·en 조각으로 해소. `messages.test.ts`의 "누락 키 0건" 정신 그대로.
- **톤 정책 확장**: 현재 `horoscope.test.ts:47`이 한국어 3단어만 본다. ko(할 것이다·반드시·확실히·틀림없이·절대) + en(will·definitely·certainly·guaranteed·must) + 공포 어휘(위험·사고·질병·죽음 / danger·accident·illness·death) 양쪽에 건다. **영어 배열에 톤 정책이 아예 없는 것**도 이 기회에 메운다.
- **민감도**: 365일 × 12별자리 = 4,380 샘플에서 인접 날짜쌍의 상위 신호가 달라지는 비율 ≥ 95% (문체가 아니라 `signalId` 수준).
- **분포·비퇴화**: 단일 조각이 전체의 15% 초과 점유 금지, 면당 서로 다른 조각 20종 이상. "모든 계산이 결국 하나의 삼분각으로 수렴"하는 실패를 잡는다.
- **히스테리시스**: orb 경계를 넘나들어 하루걸러 결론이 뒤집히지 않는지.
- **골든 픽스처**: 구조화 출력(`signalId`+`slotId`+`evidence`)만 스냅샷한다. **산문은 스냅샷하지 않는다** — 문구를 다듬을 때마다 diff가 터진다.

### 2-8. 하위 단계 분할 (각각 독립 배포 가능)

| 단계 | 내용 | 규모 |
|---|---|---|
| **2-A 기반** | `relations.ts` + `sky.ts` + `assertValidDateString`에 1900..2100 범위 검사 추가(현재 `"0001-01-01"`도 통과한다 — 트랜싯을 붙이면 즉시 문제) + 계산층 오라클 테스트 전부. **어떤 페이지에도 연결하지 않는다.** | ~350 + 250 테스트 |
| **2-B 동양 축** | `dayFortune.ts`·`signals.ts`·`lexicon/ganji.ts`, `computeDailyReading` 신설, tier 반영, `EvidenceTable`, `alternates.canonical`. 24개 색인면 중 12개가 즉시 실근거화 | ~450 + 200 |
| **2-C 서양 축** | `reference.ts`·`transit.ts`·`lexicon/aspects.ts`. 나머지 12면. 인수분해·폴백 사슬이 실제로 시험되는 단계 | ~550 + 250 |
| **2-D 깊은 면** | `/r/[data]/today`, orb 기반 도수 정밀 트랜싯, `ReportHeader` 3번째 탭, `PersonalizeCta` 양방향 링크 | ~450 + 150 |
| **2-E 정리** | `phrases.ts` 삭제, 가중치 튜닝, 메모이제이션, `Chrome.tsx` 죽은 분기 처리 | ~150 |

**2-A를 먼저, 페이지 연결 없이 하는 이유**: 뒤 단계 전체가 이 계산 위에 선다. 여기서 오라클 검증이 실패하면 진행할 이유가 없고, 실패해도 사용자에게 아무 영향이 없다.
**동양(2-B)을 서양(2-C)보다 먼저 하는 이유**: 띠=지지라 프록시가 전혀 필요 없고, 어휘가 평면이며, 73k건 오라클이 공짜다. 투입 대비 증거량이 가장 높다.

### 2-9. 함정 (구현 시 반드시 확인)

1. **`noUncheckedIndexedAccess`** — 새 룩업 테이블 전부 `stemAt`/`branchAt`/`signAt`의 `?? throw new RangeError` 패턴을 따라야 한다. 배열 인덱스 직접 접근은 컴파일 에러다.
2. **배럴 import 금지** — `@engine/saju`를 집으면 `korean-lunar-calendar`가 딸려온다. `@engine/saju/pillars`처럼 직접 집는다.
3. **UTC 정오 vs 로컬 정오** — 얕은 페이지에서 달 궁이 최대 ±6.5° 어긋난다. `astro/index.ts:158`의 `moonSignAmbiguous`(경계 7° 이내) 판정을 빌려 note로 고지한다.
4. **`?d=` 색인 폭발** — `alternates.canonical`을 2-B에서 반드시 함께 넣는다.
5. **`Object.freeze` 깊이** — `evidence`/`lines`/`notes` 배열과 원소 전부 동결. 기존 엔진의 중첩 동결 패턴을 따른다.
6. **`disclaimerEntertainment` → `disclaimerCultural` 전환** — 2-B 배포 전 두 문구를 나란히 놓고 카피 검토가 필요하다. 사용자에게 보이는 신뢰도 서술이 바뀐다.

---

## Phase 3 — 제품 깊이 B: 기능 간 연결과 통합 리포트

지금 5개 기능은 서로를 모른다. 사용자는 같은 생년월일을 반복 입력하고, 성향검사는 새로고침하면 50문항이 날아간다.

### 3-1. 프로필 재사용 확대

`src/lib/profile.ts`의 `StoredProfile`(localStorage `lumina.profile.v1`)은 현재 사주에서만 쓰인다.

- **수비학**: `NumerologyForm`이 저장된 생년월일을 초기값으로 읽는다. 이름만 추가 입력.
- **운세**: 저장된 생년월일에서 태양 별자리·십이지를 유도해 `SignPicker` 기본 선택.
- 기존 `useSyncExternalStore` 3종(`subscribeProfile`/`getProfileSnapshot`/`getProfileServerSnapshot`)을 그대로 재사용한다. 새 상태 관리 도입 금지.

### 3-2. 성향검사 진행 상황 보존

`src/components/psychometrics/SurveyForm.tsx` — 50문항 답변을 `localStorage`에 초안 저장(`lumina.ipip.draft.v1`). 이탈률에 직결된다. `src/lib/consent.ts`·`profile.ts`와 같은 스토어 패턴을 따른다.

### 3-3. 통합 리포트

새 라우트 `/r/[data]/all`. 하나의 프로필로 사주·점성술·수비학·운세를 한 화면에 병렬 배치.

**3계층 철학 준수가 핵심이다.** 여러 체계의 결과를 점수로 합산하거나 평균 내지 않는다. `src/engine/shared/tier.ts` 주석이 명시하듯 "인식론적으로 다른 체계이므로 다른 렌즈로 본 나"로 병렬 표기한다. 각 섹션에 `TierBadge`와 해당 `Disclaimer`를 유지한다.

### 3-4. 미사용 안전장치 연결

- `requiresDisclaimer()` (`src/engine/shared/tier.ts:37`)가 앱 코드에서 한 번도 호출되지 않는다. 엔진 README가 "true면 UI는 반드시 고지문을 렌더링한다"고 규정한 가드다. `src/components/ui/Chrome.tsx`의 `Disclaimer`에서 실제로 호출하거나, 계약이 바뀌었다면 README를 고친다.
- `src/engine/psychometrics/reliability.ts`(98 LOC, `cronbachAlpha`)가 어디서도 소비되지 않는다. `scientific` 계층 주장을 뒷받침하는 지표이므로 `psychometricsModel.ts`에 연결하거나 삭제한다 — 둘 중 하나. 테스트만 있고 사용자에게 닿지 않는 상태로 두지 않는다.

**검증**: e2e에 "사주 입력 → 수비학 이동 시 생년월일 자동 채움", "성향검사 중 새로고침 후 답변 유지" 시나리오 추가.

---

## Phase 4 — 제품 깊이 C: 해석 콘텐츠

계산은 이미 정확하다. 부족한 건 읽을 거리다. 체류시간과 광고 노출에 직결된다.

- **사주 리포트**: 십신 10종·십이운성 12종·대운 전환기 해설을 `messages/{ko,en}.json`에 추가 (현재 `saju` 네임스페이스 96키).
- **타로**: 78장 × 정/역 의미. `tarotModel.ts`의 톤 정책("결정론적 예언 금지, 위치마다 성찰 질문 하나")을 유지한다.
- **점성술**: 행성 10 × 별자리 12 조합 해설, 주요 각 해설.
- 카탈로그가 커지므로 `src/i18n/__tests__/messages.test.ts`의 ko/en 키 패리티 게이트를 매 추가마다 확인한다.
- `en.json`의 `psychometrics.factors.*` 하위에 `"ko"`라는 이름의 키가 영어 텍스트를 담고 있어 `FactorBar.tsx`가 이 네임스페이스를 우회하는 상태다. 이 참에 정리한다.

---

## Phase 5 — 제품 깊이 D: 신규 기능 (궁합 · 연간운)

가장 범위가 크므로 마지막. 착수 전 별도 설계를 거친다.

- **연간운** — `src/engine/saju/luck.ts`에 대운·세운이 이미 있다. 신규 계산이 아니라 **기존 계산의 표현 확장**이라 상대적으로 가볍다. 먼저 착수 권장.
- **궁합** — 두 프로필 간 사주 합/충. 신규 엔진 `src/engine/synastry/`. URL에 프로필 2개를 담아야 하므로 `share.ts` 인코딩 확장 필요. 서버에 개인정보를 두지 않는 원칙 유지.

---

## Phase 6 — i18n 구조 전환과 SEO

콘텐츠가 갖춰진 뒤 해야 효율적이다 (메시지 카탈로그가 Phase 4에서 계속 늘어남).

### 6-1. `localePrefix: "as-needed"` 전환

현재 `src/i18n/request.ts:10,16`이 `cookies()`/`headers()`를 호출하므로 **모든 페이지가 강제로 동적 렌더링**되고, 쿠키 없이 오는 크롤러는 항상 ko를 본다.

- `src/i18n/routing.ts` 신규 + `middleware.ts` 도입. ko는 루트 유지, en은 `/en/`.
- 기존 공유 링크(`/r/[data]`, `/tarot/[spread]/[seed]`)는 ko로 계속 유효 — 하위호환이 깨지지 않는다. **선행 조건**: 인코딩 문자열을 하드코딩한 회귀 e2e를 먼저 추가한다(검증 방법 절 참고).
- `src/components/i18n/LocaleSwitcher.tsx`를 쿠키 쓰기 + `router.refresh()`에서 경로 전환으로 변경.
- 정적 렌더링이 가능해진 페이지는 회복시킨다.

### 6-2. 검색 노출 기반

- `src/app/robots.ts` 구현 완료 — 개인 결과 URL은 차단하고 공개 랜딩·정보 페이지를 허용한다.
- `src/app/sitemap.ts`와 운세 페이지의 `alternates.canonical`은 **Phase 2-B에서 이미 ko 단일 로케일 기준으로 만들어진다**(`?d=` 색인 폭발을 막기 위해 그 시점에 필요). 여기서는 **en 로케일 URL을 추가**하고 `alternates.languages`로 hreflang 쌍을 출력하도록 확장한다.
- 색인 대상은 랜딩 5개 + 운세 24면(12궁 × 2체계) × 2로케일. 결과 페이지의 `noindex`는 유지한다 (개인 데이터 URL).
- Phase 2에서 운세가 깊어져야 색인 가치가 실제로 생긴다 — 두 Phase는 짝이다.

### 6-3. 오류 처리 표면

`src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/loading.tsx`를 추가해 타로·운세를 포함한 전역 오류·로딩 표면을 구현했다.

---

## Phase 7 — 상용 운영 요건

### 7-1. 광고 활성화

- `public/ads.txt` — 현재 전 줄이 주석이라 **파일이 무효**하다. 실제 게시자 ID로 활성화하지 않으면 AdSense가 도메인을 플래그한다.
- `NEXT_PUBLIC_ADSENSE_CLIENT` + 실제 슬롯 ID 설정. `AdSlot`/`layout.tsx`는 이미 환경변수만으로 켜지도록 돼 있어 **코드 변경 불필요**.
- 광고 슬롯은 사주·점성술·타로·운세·수비학·성향검사·궁합·통합 리포트와 개인화 오늘 운세 화면까지 연결했다. 실제 게시자 ID가 없으면 DOM을 만들지 않고, 활성화 시 `AdSlot`의 고정 높이 예약(CLS 방지)을 사용한다.
- `.env.example` 구현 완료 — 실제 게시자 ID·도메인은 운영자가 주입한다.

### 7-2. 동의 관리 (CMP)

`src/lib/consent.ts`는 주석이 스스로 밝히듯 **인증 CMP의 자리표시자**다. Google은 EEA/UK 트래픽에 Google 인증 CMP를 요구하므로, en 글로벌 타깃에서는 이 상태로 광고를 켤 수 없다.

- Google Funding Choices(무료 인증 CMP) 연동. 기존 `subscribeConsent`/`getConsentSnapshot` 인터페이스를 유지하고 내부 구현만 교체하면 `AdSlot`은 손대지 않아도 된다.

### 7-3. 법적 문서 확정

`/privacy`·`/terms`가 "draft" 캡션(`policy.draftNote`)을 달고 있다. 광고·쿠키·제3자 데이터 처리 내용을 실제 운영 기준으로 확정하고 draft 표기를 제거한다.

### 7-4. 문서화

- `README.md`를 제품 설명·주요 경로·실행법·운영 전 확인 항목으로 교체했다.
- `src/engine/README.md`에 shared·saju·astro·horoscope·tarot·numerology·psychometrics·characters·synastry의 현재 계약을 문서화했다.

### 7-5. 관측

에러 추적이 전무하다. 백엔드 없는 구조와 호환되는 클라이언트 사이드 에러 리포팅과 `@vercel/analytics` 수준의 최소 계측을 도입한다. 개인정보 비수집 원칙은 유지한다.

---

## 검증 방법

각 Phase 종료 시 아래를 모두 통과해야 다음으로 넘어간다.

```bash
pnpm lint && pnpm typecheck && pnpm test:cov && pnpm build && pnpm test:e2e
```

추가 확인:
- **커버리지** — `src/lib`가 리포트에 나타나고 임계 통과. 엔진 교차검증(사주 436케이스 100%, 점성술 0.05°)이 계속 녹색.
- **성능** — Chrome DevTools MCP로 모바일 Lighthouse. 켈틱크로스와 사주 리포트 두 무거운 페이지 기준 LCP < 2.5s, CLS < 0.1.
- **하위호환** — `src/lib/__tests__/share.test.ts`가 고정된 현재 포맷 링크와 레거시 12필드 링크를 직접 디코드하고, `e2e/saju.spec.ts:56`은 새 브라우저 컨텍스트에서 실제 공유 링크 재현을 검증한다.
- **결정론** — 같은 시드/날짜/프로필이 항상 같은 출력을 내는지. 특히 Phase 2에서 트랜싯 계산을 넣은 뒤.
- **i18n** — ko/en 키 패리티 테스트(`src/i18n/__tests__/messages.test.ts`) 통과. Phase 6 후 hreflang 양방향 확인.

---

## 남은 위험

1. **미백업 상태** — Phase 0 완료 전까지 제품 전체 소실 위험. 최우선.
2. **400MB 커밋** — 재인코딩 전에 자산을 커밋하면 git 히스토리에서 되돌릴 수 없다. Phase 0-1과 Phase 1-2의 순서를 반드시 지킨다.
3. **CMP 없이 광고 활성화** — EEA/UK 트래픽에 대해 정책 위반. Phase 7-2 없이 7-1만 하면 안 된다.
4. **i18n 전환의 링크 파손** — Phase 6은 URL 구조를 바꾼다. 전환 전 공유 링크 e2e 고정이 선행되어야 한다.
5. **범위** — 깊이 4갈래를 모두 선택했으므로 Phase 2~5가 전체 일정의 대부분이다. Phase 2만 해도 약 1,950 LOC + 850 LOC 테스트다. Phase 5(궁합)는 신규 엔진 설계가 필요해 착수 전 별도 브레인스토밍을 권한다.
6. **신뢰도 표기 변경이 사용자에게 보인다** — Phase 2-B에서 운세의 tier가 `entertainment` → `cultural`로 바뀌고 고지문 문구가 통째로 교체된다. 계산 근거가 실제로 생겼으므로 정당하지만, 배포 전 두 문구를 나란히 놓고 카피 검토가 필요하다. 그리고 `EvidenceTable`(근거 표) 없이 tier만 올리면 자기 선언에 불과하므로, 둘은 반드시 같은 배포에 묶는다.
7. **해석층은 검증 불가능한 영역이 남는다** — "이 문장이 맞는가"는 어떤 오라클로도 확인할 수 없다. Phase 2-7의 불변식·커버리지·분포 게이트는 "근거에서 나왔는가"와 "퇴화하지 않았는가"만 보장한다. 문구 자체의 품질은 사람의 검토가 필요하다.
8. **오라클 라이브러리의 위치** — `lunar-javascript`/`astronomia`는 교차검증 전용 devDependency다. 런타임 번들에 들어가지 않는다는 전제가 유지되는지 Phase 2에서 새 계산을 넣을 때 재확인한다. Phase 2-A의 일진 전수 스윕(73,414일)이 `lunar-javascript` 의존을 크게 늘리므로 특히 주의.
