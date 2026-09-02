# 사주 출생지 입력 정밀화 설계

> 작성일: 2026-09-02
> 상태: 설계 승인 완료, 구현 계획 수립 예정
> 대상: `/saju`, `/astro`가 공유하는 `BirthForm`의 "태어난 곳" 입력과, 그 정밀도를 사주풀이 해석에 반영하는 계산 기록 화면
> 후속 분리: 위경도 직접 수동 입력(고급 옵션)

## 1. 목적

현재 "태어난 곳"은 서울·부산 등 국내 10개와 해외 6개, 총 16개 대도시로 고정된 `<select>`다. 사용자가 "경기도 의정부"처럼 실제 출생지를 입력할 방법이 없어, 진태양시 보정(경도 보정 + 균시차)이 인근 대도시 좌표로 부정확하게 계산된다. 이번 작업은 입력을 시/군/구(국내)·도시(해외) 단위로 구체화하고, 그렇게 얻은 정밀한 위치가 사주풀이 해석 문장에도 드러나게 한다.

## 2. 현재 구조 확인

- `src/engine/shared/time.ts`의 `computeTrueSolarTime`은 이미 임의의 위경도로 진태양시(경도 보정 + 균시차)를 계산한다. 표준자오선은 그 시점의 실제 UTC 오프셋에서 역산하므로 하드코딩된 도시 가정이 없다.
- `src/engine/saju/index.ts`의 `computeSaju`도 `BirthPlace.lat/lng`를 그대로 받아 계산한다 — 16개 프리셋에 대한 특수 처리는 없다.
- `src/lib/share.ts`의 `encodeProfile`/`decodeProfile`은 프리셋 인덱스가 아니라 **원시 `lat`/`lng`/`timeZone`/`placeLabel` 값 자체**를 URL에 담는다. 즉 입력 UI를 무엇으로 바꾸든 공유 링크 포맷은 그대로 호환된다.
- 결과 화면(`src/app/r/[data]/page.tsx`, `src/lib/reportModel.ts`)은 타임존·경도보정·균시차·진태양시를 이미 수치로 표시하고, 시간대가 바뀌면 `trueSolarShift` 같은 설명 문구도 자동 생성한다.
- 한계는 순수하게 입력 쪽이다: `src/lib/profile.ts`의 `PLACES`(16개 고정 배열)와 `src/components/BirthForm.tsx`의 `<select>`.
- `BirthForm`은 `/saju`와 `/astro`(`resultSuffix="/astro"`)가 공유하므로, 이번 변경은 점성술의 하우스 계산(위도 의존)도 함께 정밀해진다.
- `src/components/synastry/CompatibilityForm.tsx`(궁합 기능)도 동일한 `PLACES` 배열과 `<select>` 패턴을 별도로 쓰고 있다 — 이번 작업에서 함께 교체해야 깨지지 않는다.
- `placeDisplayLabel()`은 6곳(`r/[data]/page.tsx`, `r/[data]/opengraph-image.tsx`, `r/[data]/astro/page.tsx`, `r/[data]/all/page.tsx`, `compatibility/[left]/[right]/page.tsx` 등)에서 영어 로케일 표시에 쓰인다. 이 호출들은 대부분 서버 컴포넌트이므로, 해외 수만 건 데이터셋을 매 요청마다 검색해 영어 이름을 찾는 방식은 쓰지 않는다 — 자세한 내용은 7절.

## 3. 승인된 핵심 결정

1. **정적 데이터셋 내장.** 실시간 지오코딩 API(카카오 로컬/구글 등)는 쓰지 않는다. API 키 관리, 서버 프록시, 네트워크 의존성을 늘리지 않고 지금처럼 브라우저 안에서 계산이 끝나는 구조를 유지한다.
2. **해외 도시는 완전한 공개 데이터셋 기준으로 폭넓게.** 임의로 몇백 개를 골라 담지 않고, 인구 15,000명 이상 도시를 포함하는 공개 데이터셋(GeoNames류, 출처가 명확하고 재검증 가능한 것) 전체를 쓴다.
3. **입력 UI는 검색형 콤보박스 하나로 통합.** 국내/해외 구분 없이 단일 검색창에서 "의정부"를 치면 "경기도 의정부시"가 바로 나온다. 단계형(국가→시/도→시/군/구) 선택지는 채택하지 않는다.
4. **해석에도 출생지를 명시적으로 반영.** (a) 계산 기록에 출생지명 + 보정 분(分)을 문장으로 노출, (b) 해외 출생자를 위해 같은 순간의 한국 표준시(KST) 환산을 추가로 보여준다. 계산 로직 자체는 바뀌지 않는다 — 이미 정확한 값을 서사/표시로 드러내는 것뿐이다.
5. **기존 16개 프리셋은 검색창으로 완전히 대체한다.** "자주 찾는 곳" 같은 별도 UI 요소를 남기지 않는다.
6. **위경도 직접 수동 입력은 이번 범위에서 뺀다(YAGNI).** 시/군/구·도시 단위 해상도면 진태양시 오차가 길어야 1~2분 수준이라 실익이 낮다. 필요해지면 별도 스펙으로 다룬다.

## 4. 범위

### 4.1 포함
- 국내 시/군/구(세종특별자치시 포함 약 228개) 좌표 데이터
- 해외 도시(인구 15,000명 이상, GeoNames류 공개 데이터셋 전량) 좌표 데이터
- 두 데이터를 한 검색창에서 찾는 `LocationCombobox` 컴포넌트, `BirthForm`의 기존 `<select>` 대체
- `StoredProfile`/`toBirthInput`/`encodeProfile`/`decodeProfile`과의 연결 (스키마 변경 없음)
- 계산 기록에 출생지 기반 보정 문장 추가
- 해외 출생자용 KST 환산 표시 추가
- 기존 저장 프로필·공유 링크 하위 호환 검증

### 4.2 제외
- 위경도 직접 수동 입력
- 실시간 지오코딩/주소 검색 API 연동
- 해외 도시명 전량 한글 번역(상위 100~200개 관용 표기만 별도 처리)
- 사주 외 다른 엔진(수비학 등)의 해석 문구 변경 — 수비학은 출생지를 쓰지 않으므로 영향 없음

## 5. 데이터 설계

### 5.1 스키마
```ts
interface LocationEntry {
  readonly ko: string;        // "경기도 의정부시" / 해외는 영문 도시명
  readonly en: string;        // 국내: 표준 로마자 표기. 해외: ko와 동일(영문)
  readonly countryCode?: string; // 해외만. ISO 3166-1 alpha-2 (예: "US", "JP")
  readonly lat: number;
  readonly lng: number;
}
```
타임존은 데이터에 저장하지 않는다 — 이미 쓰는 `tz-lookup`(`src/engine/shared/time.ts`의 `resolveTimeZone`)으로 선택 시점에 위경도로부터 즉석 계산한다.

### 5.2 소스와 출처 기록 (설계 단계에서 실제 데이터로 검증 완료)
- 국내·해외 모두 **GeoNames**(CC BY 4.0, https://download.geonames.org/export/dump/) 하나의 출처로 통일한다 — 라이선스와 파이프라인이 하나라 관리가 단순하다.
  - 국내: `KR.zip` → `KR.txt`를 받아 `feature code == "ADM2"`(2차 행정구역, 시/군/구에 해당)만 추린다. 실제로 받아 확인한 결과 **정확히 229개, 중복 없음**이었고, 지역별 개수(서울 25개 자치구, 경기도 31개, 부산 16개 등)가 실제 행정구역 수와 일치했다. `feature code == "ADM1"`(17개 — 실제 한국의 17개 광역시/도와 일치)에서 상위 도/광역시명을 얻어 `"{도} {시/군/구}"` 형태로 합성한다(세종특별자치시처럼 ADM2 쪽 이름이 비어 있으면 ADM1 이름만 쓴다 — 실데이터로 확인한 예외 케이스).
  - 해외: `cities15000.zip`(인구 15,000명 이상 또는 수도, 현재 약 34,000행) → 국가코드가 `KR`인 행은 제외(국내는 위 파이프라인이 이미 담당). `asciiname` 컬럼(항상 채워져 있음, 실데이터로 확인)을 그대로 표시 이름으로 쓴다.
  - 두 파일 모두 tab-delimited, UTF-8. 정확한 컬럼 순서는 `readme.txt`(같은 디렉터리)에 문서화되어 있다: geonameid, name, asciiname, alternatenames, latitude, longitude, feature class, feature code, country code, cc2, admin1 code, admin2 code, admin3 code, admin4 code, population, elevation, dem, timezone, modification date.
- 데이터 생성은 1회성 빌드 스크립트(`scripts/build-korea-locations.mjs`, `scripts/build-world-cities.mjs`)로 하고, 산출물만 저장소에 커밋한다 — 런타임에 외부 소스를 호출하지 않는다. 각 산출 파일 상단에 출처 URL과 생성 날짜를 주석으로 남긴다.
- 예시(실제 검증된 값): "의정부" 검색 시 `{ ko: "경기도 의정부시", en: "Uijeongbu-si, Gyeonggi-do", lat: 37.73865, lng: 127.0477 }`.

### 5.3 배치와 로딩
- 국내 228개: `src/data/koreaLocations.ts`에 그대로 포함(수십 KB 수준, 모든 페이지 번들에 넣어도 무리 없음).
- 해외 수만 개: 클라이언트 번들에 넣지 않는다. `public/data/world-cities.json`으로 정적 배포하고, `LocationCombobox`가 처음 포커스될 때 1회 `fetch`해서 모듈 스코프 캐시(싱글턴 프라미스)에 저장한다. 이후 재검색은 네트워크 요청 없이 메모리에서 처리한다. 같은 오리진의 정적 파일이므로 "외부 서버 호출 없음" 원칙은 유지된다.
- 검색 상위 100~200개 관용 한글 표기(뉴욕→New York 등)는 `src/data/cityAliasesKo.ts`에 별도로 두고 검색 인덱스에서만 참조한다.

## 6. 검색 UI — `LocationCombobox`

- 새 클라이언트 컴포넌트 `src/components/LocationCombobox.tsx`. `BirthForm.tsx`의 "태어난 곳" `<select>` 블록(현재 296~322행)을 대체한다.
- WAI-ARIA combobox 패턴: 방향키 이동, Enter 선택, Esc 닫기, 스크린리더용 라벨/역할 속성.
- 검색 로직은 `src/lib/locationSearch.ts`에 분리: 국내 데이터(항상 메모리에 있음) + 해외 데이터(지연 로드분, 로드 전에는 국내만 검색되고 로딩 인디케이터 표시) + 한글 별칭을 합쳐 부분일치/접두어 기준으로 상위 N개를 반환하는 순수 함수. 무거운 퍼지서치 라이브러리는 추가하지 않는다.
- 선택 시 `onSelect({ ko, en, lat, lng })`로 상위에 전달 → `BirthForm`/`CompatibilityForm`이 각각 `update({ placeLabel: ko, placeLabelEn: en, lat, lng, timeZone: resolveTimeZone({lat, lng}) })` 호출(현재 `PLACES.find` 콜백과 같은 자리). 컴포넌트 자체는 두 폼에서 그대로 재사용한다.
- 해외 도시명은 `Intl.DisplayNames(locale, { type: "region" })`로 국가명만 로케일에 맞춰 붙여 보여준다(예: "일본 · Tokyo"). 도시명 자체는 번역하지 않는다(브라우저 내장 API라 추가 데이터 비용 없음).

## 7. 상태/엔진 연결과 하위 호환

- **`StoredProfile`에 `placeLabelEn: string` 필드를 추가한다.** 선택 시점에 콤보박스가 돌려주는 `en` 값을 함께 저장한다. 이렇게 하면 영어 로케일 표시(`placeDisplayLabel`)가 저장된 값을 그대로 읽기만 하면 되고, 서버 컴포넌트가 요청마다 해외 수만 건 데이터셋을 다시 검색할 필요가 없다 — `BirthForm`/`CompatibilityForm`은 클라이언트 컴포넌트라 검색 시점엔 데이터가 이미 메모리에 있지만, 결과를 읽는 `r/[data]/page.tsx` 등은 서버 컴포넌트라 그 데이터를 다시 들고 있을 이유가 없다.
- `encodeProfile`/`decodeProfile`(`src/lib/share.ts`)의 `Packed` 튜플에 `placeLabelEn`을 추가해야 한다 — **스펙 초안에서는 "수정 불필요"로 잘못 판단했던 부분**이다. 튜플 길이가 12(레거시)/13(현재)/14(신규)까지 세 갈래를 모두 허용해 과거 공유 링크가 깨지지 않게 한다. 새 필드가 없는 링크는 `placeLabelEn`을 빈 문자열로 채우고, `placeDisplayLabel`이 빈 문자열이면 아래 레거시 표 폴백으로 넘어간다.
- `src/lib/profile.ts`의 `PLACES`(16개)는 제거한다. `placeDisplayLabel(rawLabel, rawLabelEn, locale)`은 다음 순서로 값을 정한다: (1) `locale === "ko"`면 항상 `rawLabel` 그대로, (2) `locale === "en"`이고 `rawLabelEn`이 있으면 그 값, (3) 없으면(과거 저장분) 기존 16개 프리셋만 담은 작은 고정 표(`LEGACY_PLACE_LABELS_EN`, 데이터셋 조회 없이 상수 16줄)에서 찾고, (4) 그래도 없으면 `rawLabel`을 그대로 반환. 새 데이터셋을 조회하지 않으므로 이 함수는 여전히 가볍다.
- `DEFAULT_PROFILE`은 서울 좌표를 그대로 유지하고 `placeLabelEn: "Seoul"`을 추가한다.
- `toBirthInput`, `computeSaju`는 수정하지 않는다 — 이미 임의의 좌표를 받아들이는 구조다.

## 8. 해석 고도화

### 8.1 출생지 서사 반영
- `reportModel.ts`의 `ReportView.precision`에 필드를 추가하지 않고, 기존 `placeLabel` + `precision.totalCorrectionMinutes`를 계산 기록 섹션에서 문장으로 조합한다.
- 새 i18n 키(예: `placeCorrectionNote`)를 보간 파라미터(`place`, `minutes`, 방향)와 함께 추가하고, `src/app/r/[data]/page.tsx`의 계산 기록(`section-calc`)에 `calcNote` 근처에 한 줄로 노출한다. 예: "경기도 의정부 기준, 표준시보다 약 32분 이른 진태양시로 보정되었습니다." 정확한 문구는 구현 시 기존 `noteTrueSolarShift` 패턴을 따라 다듬는다.
- 계산 로직 변경 없음 — 이미 갖고 있는 `totalCorrectionMinutes`를 문장으로 드러내는 것뿐이다.

### 8.2 해외 출생자 KST 환산
- `reportModel.ts`의 `buildReportView`에서 `result.time.instantISO`를 `Asia/Seoul`로 재포맷한 값을 `precision.kstLabel: string | null`로 추가(`timeZone`이 이미 `Asia/Seoul`이면 `null`).
- `r/[data]/page.tsx`의 정밀도 `<dl>`에 `kstLabel`이 있을 때만 "한국 표준시 환산" `DataRow`를 추가로 렌더링.
- 순수 표시 추가이며 기존 계산 파이프라인은 건드리지 않는다.

## 9. 테스트 계획

- `src/lib/__tests__/locationSearch.test.ts`(신규): 부분일치/접두어 매칭, 한글 별칭 매칭, 국내/해외 혼합 정렬.
- `src/lib/__tests__/profile.test.ts` 또는 신규 파일: `placeDisplayLabel`이 알 수 없는 라벨을 원문 그대로 돌려주는 하위 호환 테스트.
- `src/lib/__tests__/reportModel.test.ts`(있다면 확장, 없다면 신규): `kstLabel`이 국내 출생 시 `null`, 해외 출생 시 올바른 KST 문자열인지.
- 기존 `decodeProfile`/`encodeProfile` 테스트가 있다면 회귀 확인만 하고 변경하지 않는다.
- E2E(Playwright): `/saju`에서 검색창에 "의정부" 입력 → 결과 선택 → 제출 → 결과 페이지에 "경기도 의정부시"와 보정 문장이 뜨는지 스모크 테스트 1개.

## 10. 리스크

- 해외 도시 데이터셋 규모(수만 건)로 인한 `world-cities.json` 파일 크기 — 정적 파일이라 최초 검색 시에만 로드되고 브라우저/CDN 캐시가 걸리므로 반복 방문에는 영향 없지만, 최초 로드 지연은 실측 후 조정(예: 국가별 분할 로드)이 필요할 수 있다.
- 국내 228개·해외 수만 개 데이터의 출처 검증에 시간이 걸릴 수 있다 — 신뢰 가능한 출처를 못 찾으면 구현 단계에서 즉시 보고하고 범위를 재조정한다.
- 관용 한글 표기(별칭) 목록은 상위 100~200개로 한정되므로, 그 밖의 도시는 한글로 검색되지 않는다 — 의도된 제약이며 UI 도움말 문구로 안내한다.
