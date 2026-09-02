# 사주 출생지 입력 정밀화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 16-city fixed dropdown for "태어난 곳" with a searchable combobox covering ~229 Korean si/gun/gu and ~34,000 overseas cities (GeoNames), and surface the resulting precision (birthplace name, true-solar-time correction, KST equivalent for overseas births) in the saju interpretation copy.

**Architecture:** Two build-time data pipelines (GeoNames `KR.zip` → domestic dataset committed as TS; GeoNames `cities15000.zip` → overseas dataset committed as a lazily-fetched static JSON) feed a pure search function, consumed by a new `LocationCombobox` client component that replaces the `<select>` in both `BirthForm` and `CompatibilityForm`. `StoredProfile` gains a `placeLabelEn` field so English-locale display never needs to re-search the large dataset. The saju engine itself (`computeSaju`, `computeTrueSolarTime`) is untouched — it already accepts arbitrary lat/lng.

**Tech Stack:** Next.js App Router, TypeScript, next-intl, Vitest, Playwright, GeoNames (CC BY 4.0) as the sole location data source, native `fetch`/`Intl.DisplayNames` (no new runtime dependencies).

**Spec:** `docs/superpowers/specs/2026-09-02-saju-birthplace-precision-design.md`

## Global Constraints

- No new runtime dependency for geocoding or search — static data only, no third-party API calls at runtime (Spec §3.1).
- Overseas dataset excludes country code `KR` — Korea is fully covered by the dedicated domestic dataset (verified: `cities15000.txt` contains 147 Korean rows that would otherwise duplicate/conflict with the domestic dataset).
- Every coordinate must trace to GeoNames (CC BY 4.0, https://download.geonames.org/export/dump/) — never hand-typed or guessed (Spec §5.2, AGENTS.md).
- `encodeProfile`/`decodeProfile` must keep accepting the existing 12-field and 13-field legacy formats — old share links must not break (Spec §7).
- The 16-entry `PLACES` preset is fully removed, not kept alongside the search box (Spec §3 decision 5).
- `src/lib/profile.ts`'s `placeDisplayLabel` must stay dataset-free (no import of the ~1.4 MB world dataset into code reachable from Server Components) — it must resolve purely from stored fields plus a small constant table (Spec §7).

---

## Task 1: 국내 위치 데이터 생성 (Korea si/gun/gu dataset)

**Files:**
- Create: `scripts/build-korea-locations.mjs`
- Create: `src/data/koreaLocations.ts` (generated output, committed)

**Interfaces:**
- Produces: `export interface LocationEntry { readonly ko: string; readonly en: string; readonly lat: number; readonly lng: number; }` and `export const KOREA_LOCATIONS: readonly LocationEntry[]` (229 entries) — consumed by Task 5.

This pipeline was run and verified for real during planning: `KR.zip` → `KR.txt`, filtering `feature code == "ADM2"` yields exactly 229 rows with no duplicates, and per-province counts match Korea's real administrative geography (Seoul 25 자치구, Gyeonggi-do 31, Busan 16, etc.). Example verified output: `{ ko: "경기도 의정부시", en: "Uijeongbu-si, Gyeonggi-do", lat: 37.73865, lng: 127.0477 }`.

- [ ] **Step 1: Download and extract the GeoNames Korea dump**

```bash
mkdir -p .data-cache
curl -sL --max-time 30 -o .data-cache/KR.zip https://download.geonames.org/export/dump/KR.zip
unzip -o -q .data-cache/KR.zip -d .data-cache/KR
wc -l .data-cache/KR/KR.txt
```

Expected: `.data-cache/KR/KR.txt` exists with roughly 140,000+ lines (tab-delimited, UTF-8). `.data-cache/` must already be gitignored or added to `.gitignore` before committing anything else — it is scratch input, not a repo artifact.

- [ ] **Step 2: Write the build script**

```js
// scripts/build-korea-locations.mjs
//
// Source: https://download.geonames.org/export/dump/KR.zip (GeoNames, CC BY 4.0)
// Regenerate with: curl the zip into .data-cache/KR.zip, unzip to .data-cache/KR/KR.txt,
// then `node scripts/build-korea-locations.mjs`.
//
// Column layout (see https://download.geonames.org/export/dump/readme.txt):
// 0 geonameid, 1 name, 2 asciiname, 3 alternatenames, 4 latitude, 5 longitude,
// 6 feature class, 7 feature code, 8 country code, 9 cc2, 10 admin1 code,
// 11 admin2 code, 12 admin3 code, 13 admin4 code, 14 population, 15 elevation,
// 16 dem, 17 timezone, 18 modification date.

import { readFileSync, writeFileSync } from "node:fs";

const SOURCE_PATH = ".data-cache/KR/KR.txt";
const OUTPUT_PATH = "src/data/koreaLocations.ts";

function longestHangul(alternateNamesField) {
  if (!alternateNamesField) return null;
  const candidates = alternateNamesField
    .split(",")
    .filter((token) => /^[가-힣0-9()\s]+$/u.test(token));
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.length > a.length ? b : a));
}

function buildKoreaLocations(raw) {
  const lines = raw.split("\n").filter(Boolean);

  const provinces = new Map(); // admin1 code -> { ko, en }
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols[7] !== "ADM1") continue;
    const asciiname = cols[2];
    const ko = longestHangul(cols[3]) ?? asciiname;
    provinces.set(cols[10], { ko, en: asciiname });
  }

  const results = [];
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols[7] !== "ADM2") continue;
    const province = provinces.get(cols[10]);
    if (!province) {
      throw new Error(`ADM2 row with unknown admin1 code ${cols[10]}: ${line}`);
    }
    const asciiname = cols[2];
    const ownKo = longestHangul(cols[3]);
    const ko = !ownKo || ownKo === province.ko ? province.ko : `${province.ko} ${ownKo}`;
    const en =
      asciiname.toLowerCase() === province.en.toLowerCase()
        ? province.en
        : `${asciiname}, ${province.en}`;
    results.push({ ko, en, lat: Number(cols[4]), lng: Number(cols[5]) });
  }

  results.sort((a, b) => a.ko.localeCompare(b.ko, "ko"));
  return results;
}

function assertNoDuplicates(entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.ko)) throw new Error(`Duplicate ko label: ${entry.ko}`);
    seen.add(entry.ko);
  }
}

function toModuleSource(entries) {
  const rows = entries
    .map((e) => `  { ko: ${JSON.stringify(e.ko)}, en: ${JSON.stringify(e.en)}, lat: ${e.lat}, lng: ${e.lng} },`)
    .join("\n");
  return `/**
 * 국내 시/군/구 대표 좌표 (${entries.length}개).
 * 생성: scripts/build-korea-locations.mjs
 * 출처: https://download.geonames.org/export/dump/KR.zip (GeoNames, CC BY 4.0)
 * 생성일: ${new Date().toISOString().slice(0, 10)}
 * 이 파일은 스크립트 산출물이다 — 직접 편집하지 않는다.
 */

export interface LocationEntry {
  readonly ko: string;
  readonly en: string;
  readonly lat: number;
  readonly lng: number;
}

export const KOREA_LOCATIONS: readonly LocationEntry[] = [
${rows}
];
`;
}

const raw = readFileSync(SOURCE_PATH, "utf8");
const entries = buildKoreaLocations(raw);
assertNoDuplicates(entries);

if (entries.length < 200 || entries.length > 260) {
  throw new Error(
    `Expected roughly 220-240 Korean si/gun/gu entries, got ${entries.length}. ` +
      `GeoNames' ADM2 coverage for KR may have changed — inspect before proceeding.`,
  );
}

writeFileSync(OUTPUT_PATH, toModuleSource(entries));
console.log(`Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
```

- [ ] **Step 3: Run the script and inspect the result**

```bash
node scripts/build-korea-locations.mjs
```

Expected: `Wrote 229 entries to src/data/koreaLocations.ts` (229 is the verified count as of this plan; the assertion in Step 2 accepts 200–260 so a small future drift in GeoNames doesn't hard-fail — but confirm the printed count is in that neighborhood, and re-check by hand if it isn't).

- [ ] **Step 4: Spot-check known places**

```bash
node --experimental-strip-types -e "
import('./src/data/koreaLocations.ts').then(({ KOREA_LOCATIONS }) => {
  for (const name of ['의정부', '수원', '세종', '해운대', '강남', '종로']) {
    console.log(name, '->', JSON.stringify(KOREA_LOCATIONS.filter((r) => r.ko.includes(name))));
  }
});
"
```

Expected: "의정부" resolves to `{ ko: "경기도 의정부시", en: "Uijeongbu-si, Gyeonggi-do", lat: 37.73865, lng: 127.0477 }` (matches the value verified during planning). "세종" resolves to a single entry `{ ko: "세종특별자치시", ... }` with no duplicate suffix. If Node's TS stripping isn't available in this environment, open `src/data/koreaLocations.ts` directly and grep for these strings instead.

- [ ] **Step 5: Clean up the scratch download and commit**

```bash
rm -rf .data-cache
git add scripts/build-korea-locations.mjs src/data/koreaLocations.ts .gitignore
git status --short
```

If `.data-cache/` is not already in `.gitignore`, add a `.data-cache/` line to it before this `git add`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: generate Korean si/gun/gu location dataset from GeoNames"
```

---

## Task 2: 해외 위치 데이터 생성 (overseas cities dataset)

**Files:**
- Create: `scripts/build-world-cities.mjs`
- Create: `public/data/world-cities.json` (generated output, committed)

**Interfaces:**
- Produces: a JSON file containing an array of 4-tuples `[name: string, countryCode: string, lat: number, lng: number]`, sorted by name. Consumed by Task 5's `ensureWorldLocationsLoaded()`.
- Consumes: nothing from earlier tasks.

Verified during planning: `cities15000.txt` (population ≥ 15,000 or capital) has 34,129 rows; excluding country code `KR` (147 rows, already covered by Task 1) leaves 33,982 rows. `asciiname` is non-empty for every row in the file (verified), so it's safe to use directly as the display name without a fallback branch.

- [ ] **Step 1: Download and extract the GeoNames cities15000 dump**

```bash
mkdir -p .data-cache
curl -sL --max-time 60 -o .data-cache/cities15000.zip https://download.geonames.org/export/dump/cities15000.zip
unzip -o -q .data-cache/cities15000.zip -d .data-cache/world
wc -l .data-cache/world/cities15000.txt
```

Expected: `.data-cache/world/cities15000.txt` with roughly 34,000+ lines.

- [ ] **Step 2: Write the build script**

```js
// scripts/build-world-cities.mjs
//
// Source: https://download.geonames.org/export/dump/cities15000.zip (GeoNames, CC BY 4.0)
// Regenerate with: curl the zip into .data-cache/cities15000.zip, unzip to
// .data-cache/world/cities15000.txt, then `node scripts/build-world-cities.mjs`.
// Korea (country code KR) is excluded — see scripts/build-korea-locations.mjs.
//
// Output is an array of tuples, not objects, to keep the shipped JSON small:
// [name, countryCode, lat, lng]. src/lib/locationSearch.ts turns each tuple
// into a display-ready entry at load time using Intl.DisplayNames.

import { readFileSync, writeFileSync } from "node:fs";

const SOURCE_PATH = ".data-cache/world/cities15000.txt";
const OUTPUT_PATH = "public/data/world-cities.json";

const raw = readFileSync(SOURCE_PATH, "utf8");
const lines = raw.split("\n").filter(Boolean);

const rows = [];
for (const line of lines) {
  const cols = line.split("\t");
  const countryCode = cols[8];
  if (countryCode === "KR") continue;
  const name = cols[2];
  if (!name) throw new Error(`Row with empty asciiname: ${line}`);
  rows.push([name, countryCode, Number(cols[4]), Number(cols[5])]);
}

rows.sort((a, b) => a[0].localeCompare(b[0]));

if (rows.length < 20000) {
  throw new Error(`Expected at least 20,000 non-Korean city rows, got ${rows.length}.`);
}

writeFileSync(OUTPUT_PATH, JSON.stringify(rows));
console.log(`Wrote ${rows.length} entries to ${OUTPUT_PATH}`);
```

- [ ] **Step 3: Run the script and verify**

```bash
node scripts/build-world-cities.mjs
node -e "
const rows = JSON.parse(require('fs').readFileSync('public/data/world-cities.json', 'utf8'));
console.log('total rows:', rows.length);
console.log('any KR rows left:', rows.filter((r) => r[1] === 'KR').length);
console.log('Tokyo sample:', rows.find((r) => r[0] === 'Tokyo'));
console.log('New York City sample:', rows.find((r) => r[0] === 'New York City'));
"
ls -la public/data/world-cities.json
```

Expected: `total rows: 33982`, `any KR rows left: 0`, both sample lookups return a row (Tokyo: `["Tokyo","JP",35.6895,139.69171]`; New York City similarly with country code `US`). File size should print as roughly 1.4–1.5 MB.

- [ ] **Step 4: Clean up and commit**

```bash
rm -rf .data-cache
git add scripts/build-world-cities.mjs public/data/world-cities.json
git commit -m "feat: generate overseas city dataset from GeoNames cities15000"
```

---

## Task 3: 한글 별칭 매핑 (Korean exonyms for well-known cities)

**Files:**
- Create: `src/data/cityAliasesKo.ts`
- Test: `src/lib/__tests__/locationSearch.test.ts` will assert against this in Task 5 — this task only needs the data file plus a self-contained validation script run once.

**Interfaces:**
- Produces: `export interface CityAlias { readonly ko: string; readonly matchName: string; readonly matchCountryCode: string; }` and `export const CITY_ALIASES_KO: readonly CityAlias[]`. Consumed by Task 5's `searchLocations`.
- Consumes: `public/data/world-cities.json` (Task 2) — only to validate that every alias actually resolves to a real row; not imported at runtime by this file itself.

`matchName`/`matchCountryCode` must exactly equal the `[name, countryCode]` pair produced by Task 2 (i.e. GeoNames' `asciiname` + ISO country code) — not a guess. Every entry below was checked against the real generated dataset during planning.

- [ ] **Step 1: Write the alias data file**

```ts
// src/data/cityAliasesKo.ts

/**
 * 해외 도시 중 한국에서 관용적으로 쓰는 한글 표기(예: 뉴욕, 런던) 검색용 별칭.
 * matchName/matchCountryCode는 public/data/world-cities.json의 실제 행과
 * 정확히 일치해야 한다 — scripts/validate-city-aliases.mjs로 검증한다.
 * 전량 번역이 아니라 검색 편의를 위한 상위 도시 한정 목록이다.
 */

export interface CityAlias {
  readonly ko: string;
  readonly matchName: string;
  readonly matchCountryCode: string;
}

export const CITY_ALIASES_KO: readonly CityAlias[] = [
  { ko: "뉴욕", matchName: "New York City", matchCountryCode: "US" },
  { ko: "로스앤젤레스", matchName: "Los Angeles", matchCountryCode: "US" },
  { ko: "엘에이", matchName: "Los Angeles", matchCountryCode: "US" },
  { ko: "샌프란시스코", matchName: "San Francisco", matchCountryCode: "US" },
  { ko: "시카고", matchName: "Chicago", matchCountryCode: "US" },
  { ko: "라스베이거스", matchName: "Las Vegas", matchCountryCode: "US" },
  { ko: "시애틀", matchName: "Seattle", matchCountryCode: "US" },
  { ko: "보스턴", matchName: "Boston", matchCountryCode: "US" },
  { ko: "워싱턴", matchName: "Washington", matchCountryCode: "US" },
  { ko: "하와이", matchName: "Honolulu", matchCountryCode: "US" },
  { ko: "호놀룰루", matchName: "Honolulu", matchCountryCode: "US" },
  { ko: "런던", matchName: "London", matchCountryCode: "GB" },
  { ko: "파리", matchName: "Paris", matchCountryCode: "FR" },
  { ko: "베를린", matchName: "Berlin", matchCountryCode: "DE" },
  { ko: "뮌헨", matchName: "Munich", matchCountryCode: "DE" },
  { ko: "프랑크푸르트", matchName: "Frankfurt am Main", matchCountryCode: "DE" },
  { ko: "로마", matchName: "Rome", matchCountryCode: "IT" },
  { ko: "밀라노", matchName: "Milan", matchCountryCode: "IT" },
  { ko: "마드리드", matchName: "Madrid", matchCountryCode: "ES" },
  { ko: "바르셀로나", matchName: "Barcelona", matchCountryCode: "ES" },
  { ko: "암스테르담", matchName: "Amsterdam", matchCountryCode: "NL" },
  { ko: "비엔나", matchName: "Vienna", matchCountryCode: "AT" },
  { ko: "빈", matchName: "Vienna", matchCountryCode: "AT" },
  { ko: "취리히", matchName: "Zurich", matchCountryCode: "CH" },
  { ko: "모스크바", matchName: "Moscow", matchCountryCode: "RU" },
  { ko: "이스탄불", matchName: "Istanbul", matchCountryCode: "TR" },
  { ko: "두바이", matchName: "Dubai", matchCountryCode: "AE" },
  { ko: "도쿄", matchName: "Tokyo", matchCountryCode: "JP" },
  { ko: "오사카", matchName: "Osaka", matchCountryCode: "JP" },
  { ko: "교토", matchName: "Kyoto", matchCountryCode: "JP" },
  { ko: "후쿠오카", matchName: "Fukuoka", matchCountryCode: "JP" },
  { ko: "삿포로", matchName: "Sapporo", matchCountryCode: "JP" },
  { ko: "나고야", matchName: "Nagoya", matchCountryCode: "JP" },
  { ko: "요코하마", matchName: "Yokohama", matchCountryCode: "JP" },
  { ko: "베이징", matchName: "Beijing", matchCountryCode: "CN" },
  { ko: "상하이", matchName: "Shanghai", matchCountryCode: "CN" },
  { ko: "선전", matchName: "Shenzhen", matchCountryCode: "CN" },
  { ko: "광저우", matchName: "Guangzhou", matchCountryCode: "CN" },
  { ko: "청두", matchName: "Chengdu", matchCountryCode: "CN" },
  { ko: "홍콩", matchName: "Hong Kong", matchCountryCode: "HK" },
  { ko: "마카오", matchName: "Macau", matchCountryCode: "MO" },
  { ko: "타이베이", matchName: "Taipei", matchCountryCode: "TW" },
  { ko: "가오슝", matchName: "Kaohsiung", matchCountryCode: "TW" },
  { ko: "방콕", matchName: "Bangkok", matchCountryCode: "TH" },
  { ko: "싱가포르", matchName: "Singapore", matchCountryCode: "SG" },
  { ko: "쿠알라룸푸르", matchName: "Kuala Lumpur", matchCountryCode: "MY" },
  { ko: "자카르타", matchName: "Jakarta", matchCountryCode: "ID" },
  { ko: "마닐라", matchName: "Manila", matchCountryCode: "PH" },
  { ko: "하노이", matchName: "Hanoi", matchCountryCode: "VN" },
  { ko: "호치민", matchName: "Ho Chi Minh City", matchCountryCode: "VN" },
  { ko: "뭄바이", matchName: "Mumbai", matchCountryCode: "IN" },
  { ko: "델리", matchName: "Delhi", matchCountryCode: "IN" },
  { ko: "뉴델리", matchName: "New Delhi", matchCountryCode: "IN" },
  { ko: "시드니", matchName: "Sydney", matchCountryCode: "AU" },
  { ko: "멜버른", matchName: "Melbourne", matchCountryCode: "AU" },
  { ko: "오클랜드", matchName: "Auckland", matchCountryCode: "NZ" },
  { ko: "토론토", matchName: "Toronto", matchCountryCode: "CA" },
  { ko: "밴쿠버", matchName: "Vancouver", matchCountryCode: "CA" },
  { ko: "몬트리올", matchName: "Montreal", matchCountryCode: "CA" },
  { ko: "멕시코시티", matchName: "Mexico City", matchCountryCode: "MX" },
  { ko: "상파울루", matchName: "Sao Paulo", matchCountryCode: "BR" },
  { ko: "리우데자네이루", matchName: "Rio de Janeiro", matchCountryCode: "BR" },
  { ko: "부에노스아이레스", matchName: "Buenos Aires", matchCountryCode: "AR" },
  { ko: "카이로", matchName: "Cairo", matchCountryCode: "EG" },
  { ko: "요하네스버그", matchName: "Johannesburg", matchCountryCode: "ZA" },
];
```

- [ ] **Step 2: Write a one-off validation script**

```js
// scripts/validate-city-aliases.mjs
//
// Confirms every entry in src/data/cityAliasesKo.ts resolves to a real row in
// public/data/world-cities.json. Run after Task 2 and after editing the alias
// list. Not part of the app build — a manual data-quality check.

import { readFileSync } from "node:fs";

const worldRows = JSON.parse(readFileSync("public/data/world-cities.json", "utf8"));
const aliasesSource = readFileSync("src/data/cityAliasesKo.ts", "utf8");

const aliasPattern = /\{\s*ko:\s*"([^"]+)",\s*matchName:\s*"([^"]+)",\s*matchCountryCode:\s*"([^"]+)"\s*\}/g;
let match;
let missing = 0;
let count = 0;
while ((match = aliasPattern.exec(aliasesSource))) {
  count += 1;
  const [, ko, matchName, matchCountryCode] = match;
  const found = worldRows.some((row) => row[0] === matchName && row[1] === matchCountryCode);
  if (!found) {
    missing += 1;
    console.error(`MISSING: ${ko} -> ${matchName}, ${matchCountryCode}`);
  }
}

console.log(`Checked ${count} aliases, ${missing} missing.`);
if (missing > 0) process.exit(1);
```

- [ ] **Step 3: Run the validation script**

```bash
node scripts/validate-city-aliases.mjs
```

Expected: `Checked 62 aliases, 0 missing.` If any are missing, fix the `matchName`/`matchCountryCode` for that entry (search `public/data/world-cities.json` for the closest real row) rather than deleting the alias silently.

- [ ] **Step 4: Commit**

```bash
git add src/data/cityAliasesKo.ts scripts/validate-city-aliases.mjs
git commit -m "feat: add Korean exonym aliases for well-known overseas cities"
```

---

## Task 4: `resolveTimeZone`를 클라이언트에서 가볍게 쓸 수 있도록 분리

**Files:**
- Create: `src/engine/shared/timezone.ts`
- Modify: `src/engine/shared/time.ts:1-28` (remove the `resolveTimeZone` body, re-export from the new file)

**Interfaces:**
- Produces: `export function resolveTimeZone(place?: BirthPlace): string` — identical signature and behavior to the current one, now importable without pulling in `astronomy-engine`/`luxon`.
- Consumes: nothing new — `tz-lookup` and `BirthPlace`/`DEFAULT_PLACE` from `./birth`, exactly as today.

The new `LocationCombobox` (Task 7) is a client component and needs to derive a timezone from lat/lng at selection time. `time.ts` currently bundles `resolveTimeZone` together with `computeTrueSolarTime`/`equationOfTimeMinutes`, which pull in `astronomy-engine` — unnecessary weight for a component that only ever needs the timezone lookup. This is a pure move, not a behavior change; `src/engine/saju/index.ts` and `src/engine/astro/index.ts` keep importing `resolveTimeZone` from `@engine/shared/time` unchanged because `time.ts` re-exports it.

- [ ] **Step 1: Run the existing test to confirm current behavior before moving anything**

```bash
pnpm vitest run src/engine/shared/__tests__/time.test.ts
```

Expected: all tests PASS (baseline).

- [ ] **Step 2: Create `src/engine/shared/timezone.ts`**

```ts
import tzlookup from "tz-lookup";
import { DEFAULT_PLACE, type BirthPlace } from "./birth";

/**
 * 좌표로부터 IANA 타임존을 해석한다.
 *
 * IANA tz 데이터베이스는 한국의 표준시 변경 이력(1954~1961 UTC+8:30)과
 * 서머타임(1948~51, 1955~60, 1987~88)을 모두 담고 있으므로, 벽시계 시각 →
 * UTC 변환은 luxon + IANA 존에 전적으로 위임한다. 표준시 이력을 직접
 * 하드코딩하지 않는다.
 */
export function resolveTimeZone(place?: BirthPlace): string {
  if (place?.timeZone) return place.timeZone;
  if (place) {
    try {
      return tzlookup(place.lat, place.lng);
    } catch {
      /* 해양 좌표 등 조회 실패 시 경도 기반 폴백으로 내려간다. */
    }
    const offsetHours = Math.round(place.lng / 15);
    return `Etc/GMT${offsetHours <= 0 ? "+" : "-"}${Math.abs(offsetHours)}`;
  }
  return DEFAULT_PLACE.timeZone;
}
```

- [ ] **Step 3: Replace the body in `src/engine/shared/time.ts` with a re-export**

Remove lines 1-28 of `src/engine/shared/time.ts` (the `tzlookup` import and the `resolveTimeZone` function) and replace with:

```ts
import { DateTime } from "luxon";
import { MakeTime, SiderealTime, SunPosition, e_tilt } from "astronomy-engine";
import type { BirthPlace } from "./birth";

export { resolveTimeZone } from "./timezone";

const DEG = Math.PI / 180;
```

(`BirthPlace` is still used later in the file by other type signatures; keep the type-only import. `DEFAULT_PLACE` is no longer referenced directly in this file since it moved into `timezone.ts` — remove it from this file's imports if nothing else in `time.ts` uses it. Verify with a search before deleting: `grep -n "DEFAULT_PLACE" src/engine/shared/time.ts` should show no remaining uses after the removal.)

- [ ] **Step 4: Run the test again to confirm the re-export preserves behavior**

```bash
pnpm vitest run src/engine/shared/__tests__/time.test.ts
```

Expected: same PASS result as Step 1 — the test imports `resolveTimeZone` from `../time`, which still works via the re-export.

- [ ] **Step 5: Typecheck the two engine callers**

```bash
pnpm tsc --noEmit
```

Expected: no new errors. `src/engine/saju/index.ts` and `src/engine/astro/index.ts` import `resolveTimeZone` from `@engine/shared/time` unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/engine/shared/timezone.ts src/engine/shared/time.ts
git commit -m "refactor: extract resolveTimeZone into its own module for client-side use"
```

---

## Task 5: 위치 검색 유틸 (`locationSearch.ts`)

**Files:**
- Create: `src/lib/locationSearch.ts`
- Test: `src/lib/__tests__/locationSearch.test.ts`

**Interfaces:**
- Consumes: `KOREA_LOCATIONS` (Task 1, `@/data/koreaLocations`), `CITY_ALIASES_KO` (Task 3, `@/data/cityAliasesKo`).
- Produces:
  - `export interface LocationEntry { readonly ko: string; readonly en: string; readonly lat: number; readonly lng: number; }`
  - `export interface LocationSearchResult extends LocationEntry { readonly source: "domestic" | "world"; }`
  - `export function ensureWorldLocationsLoaded(): Promise<void>` — fetches `/data/world-cities.json` once, caches in module scope.
  - `export function isWorldLocationsLoaded(): boolean`
  - `export function searchLocations(query: string, limit?: number): readonly LocationSearchResult[]`
  - Test-only: `export function __resetWorldLocationsForTests(rows: readonly [string, string, number, number][] | null): void`
- Consumed by: Task 7 (`LocationCombobox`).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/locationSearch.test.ts
import { afterEach, describe, expect, it } from "vitest";
import {
  __resetWorldLocationsForTests,
  isWorldLocationsLoaded,
  searchLocations,
} from "../locationSearch";

afterEach(() => {
  __resetWorldLocationsForTests(null);
});

describe("searchLocations — domestic", () => {
  it("returns no results for an empty query", () => {
    expect(searchLocations("")).toEqual([]);
    expect(searchLocations("   ")).toEqual([]);
  });

  it("finds a Korean si/gun/gu by partial name", () => {
    const results = searchLocations("의정부");
    expect(results.some((r) => r.ko === "경기도 의정부시" && r.source === "domestic")).toBe(true);
  });

  it("matches the English romanization too", () => {
    const results = searchLocations("uijeongbu");
    expect(results.some((r) => r.ko === "경기도 의정부시")).toBe(true);
  });
});

describe("searchLocations — world (before load)", () => {
  it("returns only domestic matches when the world dataset hasn't loaded", () => {
    expect(isWorldLocationsLoaded()).toBe(false);
    const results = searchLocations("Paris");
    expect(results).toEqual([]);
  });
});

describe("searchLocations — world (after load)", () => {
  it("finds overseas cities once loaded, with country appended", () => {
    __resetWorldLocationsForTests([
      ["Paris", "FR", 48.85341, 2.3488],
      ["Paris", "US", 33.66094, -95.55551],
      ["New York City", "US", 40.71427, -74.00597],
    ]);
    expect(isWorldLocationsLoaded()).toBe(true);

    const results = searchLocations("Paris");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.source === "world")).toBe(true);
    expect(results.some((r) => r.en.includes("France"))).toBe(true);
    expect(results.some((r) => r.en.includes("United States"))).toBe(true);
  });

  it("resolves a Korean exonym alias to the matching world row", () => {
    __resetWorldLocationsForTests([
      ["Paris", "FR", 48.85341, 2.3488],
      ["New York City", "US", 40.71427, -74.00597],
    ]);
    const results = searchLocations("뉴욕");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ ko: "뉴욕", lat: 40.71427, lng: -74.00597, source: "world" });
  });

  it("does not duplicate a result reachable through both a direct match and an alias", () => {
    __resetWorldLocationsForTests([["Tokyo", "JP", 35.6895, 139.69171]]);
    const results = searchLocations("Tokyo");
    expect(results).toHaveLength(1);
  });

  it("caps results at the requested limit", () => {
    __resetWorldLocationsForTests(
      Array.from({ length: 20 }, (_, i) => [`Springfield ${i}`, "US", 30 + i, -90]),
    );
    expect(searchLocations("Springfield", 5)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
pnpm vitest run src/lib/__tests__/locationSearch.test.ts
```

Expected: FAIL — `../locationSearch` module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/locationSearch.ts
import { KOREA_LOCATIONS, type LocationEntry } from "@/data/koreaLocations";
import { CITY_ALIASES_KO } from "@/data/cityAliasesKo";

export type { LocationEntry };

export interface LocationSearchResult extends LocationEntry {
  readonly source: "domestic" | "world";
}

interface WorldCityRow {
  readonly name: string;
  readonly countryCode: string;
  readonly lat: number;
  readonly lng: number;
}

let worldRows: readonly WorldCityRow[] | null = null;
let worldPromise: Promise<void> | null = null;

/** 처음 호출될 때만 /data/world-cities.json을 받아 모듈 스코프에 캐싱한다. */
export function ensureWorldLocationsLoaded(): Promise<void> {
  if (worldRows) return Promise.resolve();
  if (!worldPromise) {
    worldPromise = fetch("/data/world-cities.json")
      .then((res) => res.json())
      .then((raw: readonly [string, string, number, number][]) => {
        worldRows = raw.map(([name, countryCode, lat, lng]) => ({ name, countryCode, lat, lng }));
      })
      .catch((error) => {
        worldPromise = null; // allow retry on next call
        throw error;
      });
  }
  return worldPromise;
}

export function isWorldLocationsLoaded(): boolean {
  return worldRows !== null;
}

/** 테스트 전용: 실제 fetch 없이 월드 데이터를 주입/초기화한다. */
export function __resetWorldLocationsForTests(
  rows: readonly [string, string, number, number][] | null,
): void {
  worldRows = rows ? rows.map(([name, countryCode, lat, lng]) => ({ name, countryCode, lat, lng })) : null;
  worldPromise = null;
}

function countryNameEn(countryCode: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

function toWorldEntry(row: WorldCityRow, koOverride?: string): LocationEntry {
  const en = `${row.name}, ${countryNameEn(row.countryCode)}`;
  return { ko: koOverride ?? en, en, lat: row.lat, lng: row.lng };
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

function dedupeByCoordinate(results: readonly LocationSearchResult[]): LocationSearchResult[] {
  const seen = new Set<string>();
  const out: LocationSearchResult[] = [];
  for (const item of results) {
    const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function searchLocations(query: string, limit = 8): readonly LocationSearchResult[] {
  const needle = normalize(query);
  if (!needle) return [];

  const domestic: LocationSearchResult[] = KOREA_LOCATIONS.filter(
    (entry) => normalize(entry.ko).includes(needle) || normalize(entry.en).includes(needle),
  ).map((entry) => ({ ...entry, source: "domestic" }));

  const aliasHits: LocationSearchResult[] = [];
  const worldHits: LocationSearchResult[] = [];
  if (worldRows) {
    for (const alias of CITY_ALIASES_KO) {
      if (!normalize(alias.ko).includes(needle)) continue;
      const row = worldRows.find(
        (r) => r.name === alias.matchName && r.countryCode === alias.matchCountryCode,
      );
      if (row) aliasHits.push({ ...toWorldEntry(row, alias.ko), source: "world" });
    }

    for (const row of worldRows) {
      if (!normalize(row.name).includes(needle)) continue;
      worldHits.push({ ...toWorldEntry(row), source: "world" });
      if (aliasHits.length + worldHits.length >= limit * 2) break; // cap scan cost, dedupe below trims further
    }
  }

  return dedupeByCoordinate([...domestic, ...aliasHits, ...worldHits]).slice(0, limit);
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
pnpm vitest run src/lib/__tests__/locationSearch.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/locationSearch.ts src/lib/__tests__/locationSearch.test.ts
git commit -m "feat: add locationSearch combining domestic, world, and alias datasets"
```

---

## Task 6: `StoredProfile.placeLabelEn` 스키마 전파

**Files:**
- Modify: `src/lib/profile.ts` (full rewrite of `PLACES`/`placeDisplayLabel` section, lines 1-46 and 164-201)
- Modify: `src/lib/share.ts` (all)
- Modify: `src/lib/reportModel.ts:120-127, 406-440`
- Modify: `src/lib/astroModel.ts:55-59, 206-210`
- Modify: `src/app/r/[data]/page.tsx:230`
- Modify: `src/app/r/[data]/opengraph-image.tsx:62`
- Modify: `src/app/r/[data]/astro/page.tsx:194`
- Modify: `src/app/r/[data]/all/page.tsx:131`
- Modify: `src/app/compatibility/[left]/[right]/page.tsx:172-173`
- Test: `src/lib/__tests__/profile.test.ts` (new)
- Test: `src/lib/__tests__/share.test.ts` (extend existing)

**Interfaces:**
- Produces: `StoredProfile.placeLabelEn: string`; `placeDisplayLabel(rawLabel: string, rawLabelEn: string, locale: "ko" | "en"): string`; `DEFAULT_PROFILE.placeLabelEn === "Seoul"`.
- Consumes: nothing from Tasks 1-5 directly (this task is schema plumbing; the combobox that populates the new field arrives in Tasks 7-9).

This is one atomic task: changing `placeDisplayLabel`'s signature and the `Packed` tuple length touches every call site at once, so it can't be split without an intermediate broken-build state.

- [ ] **Step 1: Update `StoredProfile` and remove `PLACES`/rewrite `placeDisplayLabel` in `src/lib/profile.ts`**

Replace lines 13-29 (the `StoredProfile` interface) with:

```ts
export interface StoredProfile {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly calendar: CalendarType;
  readonly isLeapMonth: boolean;
  /** 시각 미상이면 null */
  readonly hour: number | null;
  readonly minute: number | null;
  readonly gender: Gender;
  /** 23시 자시 경계 학설. 공유 링크에 함께 저장해 계산을 재현한다. */
  readonly dayBoundaryRule: DayBoundaryRule;
  readonly placeLabel: string;
  /** 영어 로케일 표시용. 검색 시점에 선택한 항목의 en 값을 그대로 저장한다 —
   *  과거 공유 링크처럼 값이 없으면 빈 문자열이고, placeDisplayLabel이 그 경우
   *  레거시 표로 폴백한다. */
  readonly placeLabelEn: string;
  readonly lat: number;
  readonly lng: number;
  readonly timeZone: string;
}
```

Replace lines 31-45 (`DEFAULT_PROFILE`) with:

```ts
export const DEFAULT_PROFILE: StoredProfile = Object.freeze({
  year: 1995,
  month: 6,
  day: 15,
  calendar: "solar",
  isLeapMonth: false,
  hour: 12,
  minute: 0,
  gender: "unspecified",
  dayBoundaryRule: "zi23",
  placeLabel: "서울",
  placeLabelEn: "Seoul",
  lat: 37.5665,
  lng: 126.978,
  timeZone: "Asia/Seoul",
});
```

Update `isValid` (around line 47-65) to also check the new field — add this condition inside the existing `&&` chain, right after the `placeLabel` check:

```ts
    typeof p.placeLabel === "string" &&
    (p.placeLabelEn === undefined || typeof p.placeLabelEn === "string") &&
```

(keep the rest of `isValid` unchanged; `placeLabelEn` is optional at the storage-validation layer because old localStorage entries predate it — `loadProfile` fills the default below).

Update `loadProfile` (around line 67-79) to default a missing field, mirroring the existing `dayBoundaryRule` default pattern:

```ts
export function loadProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) return null;
    return Object.freeze({
      ...parsed,
      dayBoundaryRule: parsed.dayBoundaryRule ?? "zi23",
      placeLabelEn: parsed.placeLabelEn ?? "",
    });
  } catch {
    // 저장소가 막혀 있거나(사생활 보호 모드) 값이 깨졌으면 없는 것으로 본다.
    return null;
  }
}
```

Replace lines 164-201 (`PLACES` array through the end of `placeDisplayLabel`) entirely with:

```ts
/**
 * 과거 16개 프리셋의 영어 표기 — 이 프리셋으로 저장된 옛 공유 링크에는
 * placeLabelEn이 없으므로, 그런 경우에만 이 작은 상수 표로 폴백한다.
 * 새 데이터셋(수만 건)은 여기서 참조하지 않는다 — placeDisplayLabel은
 * 항상 가벼워야 한다(서버 컴포넌트에서 매 요청 호출된다).
 */
const LEGACY_PLACE_LABELS_EN: Readonly<Record<string, string>> = Object.freeze({
  서울: "Seoul",
  부산: "Busan",
  대구: "Daegu",
  인천: "Incheon",
  광주: "Gwangju",
  대전: "Daejeon",
  울산: "Ulsan",
  제주: "Jeju",
  강릉: "Gangneung",
  전주: "Jeonju",
  도쿄: "Tokyo",
  베이징: "Beijing",
  뉴욕: "New York",
  로스앤젤레스: "Los Angeles",
  런던: "London",
  시드니: "Sydney",
});

/**
 * 표시용 지명. placeLabel은 로케일과 무관하게 항상 선택 시점의 값을 그대로
 * 저장한다(국내는 한글, 해외 비별칭 도시는 영문). placeLabelEn이 있으면
 * 영어 로케일에서 그 값을 쓰고, 없으면(과거 저장분) 16개 레거시 프리셋
 * 표에서 찾는다. 그래도 없으면 원문을 그대로 돌려준다.
 */
export function placeDisplayLabel(rawLabel: string, rawLabelEn: string, locale: "ko" | "en"): string {
  if (locale === "ko") return rawLabel;
  if (rawLabelEn) return rawLabelEn;
  return LEGACY_PLACE_LABELS_EN[rawLabel] ?? rawLabel;
}
```

- [ ] **Step 2: Update `src/lib/share.ts`'s `Packed` tuple and codec**

Replace the `Packed` type (lines 17-31) with:

```ts
/** 필드 순서를 고정한 배열로 줄여 URL 길이를 아낀다. */
type Packed = [
  year: number,
  month: number,
  day: number,
  calendar: number,
  leap: number,
  hour: number,
  minute: number,
  gender: number,
  lat: number,
  lng: number,
  timeZone: string,
  placeLabel: string,
  dayBoundaryRule: number,
  placeLabelEn: string,
];
```

Replace `encodeProfile` (lines 33-50) with:

```ts
export function encodeProfile(profile: StoredProfile): string {
  const packed: Packed = [
    profile.year,
    profile.month,
    profile.day,
    CALENDARS.indexOf(profile.calendar),
    profile.isLeapMonth ? 1 : 0,
    profile.hour ?? -1,
    profile.minute ?? -1,
    Math.max(0, GENDERS.indexOf(profile.gender)),
    Math.round(profile.lat * 1e4) / 1e4,
    Math.round(profile.lng * 1e4) / 1e4,
    profile.timeZone,
    profile.placeLabel,
    profile.dayBoundaryRule === "midnight" ? 1 : 0,
    profile.placeLabelEn,
  ];
  return LZString.compressToEncodedURIComponent(JSON.stringify(packed));
}
```

Replace `decodeProfile` (lines 52-121) with:

```ts
export function decodeProfile(encoded: string): StoredProfile | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const p: unknown = JSON.parse(json);
    if (!Array.isArray(p) || (p.length !== 12 && p.length !== 13 && p.length !== 14)) return null;

    const [year, month, day, calendar, leap, hour, minute, gender, lat, lng, timeZone, placeLabel, dayBoundary, placeLabelEn] =
      p;

    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > daysInGregorianMonth(year, month) ||
      !Number.isInteger(calendar) ||
      calendar < 0 ||
      calendar >= CALENDARS.length ||
      (leap !== 0 && leap !== 1) ||
      !Number.isInteger(hour) ||
      hour < -1 ||
      hour > 23 ||
      !Number.isInteger(minute) ||
      minute < -1 ||
      minute > 59 ||
      !Number.isInteger(gender) ||
      gender < 0 ||
      gender >= GENDERS.length ||
      typeof lat !== "number" ||
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      typeof lng !== "number" ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180 ||
      typeof timeZone !== "string" ||
      timeZone.length === 0 ||
      timeZone.length > 100 ||
      typeof placeLabel !== "string" ||
      placeLabel.length > 120 ||
      (p.length >= 13 && dayBoundary !== 0 && dayBoundary !== 1) ||
      (p.length === 14 && (typeof placeLabelEn !== "string" || placeLabelEn.length > 120))
    ) {
      return null;
    }

    return {
      year,
      month,
      day,
      calendar: CALENDARS[calendar] ?? "solar",
      isLeapMonth: leap === 1,
      hour: hour < 0 ? null : hour,
      minute: minute < 0 ? null : minute,
      gender: GENDERS[gender] ?? "unspecified",
      lat,
      lng,
      timeZone,
      placeLabel,
      placeLabelEn: p.length === 14 ? (placeLabelEn as string) : "",
      dayBoundaryRule: p.length >= 13 && dayBoundary === 1 ? "midnight" : "zi23",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Update the existing share tests for the new field**

In `src/lib/__tests__/share.test.ts`, update the "fixed current-format share link" test (the 13-field one) to expect `placeLabelEn: ""` in its output object:

```ts
  it("keeps decoding a fixed current-format share link", () => {
    const fixedLink =
      "NoRgnGCsA0Bs0hgBmikAmVWDMB2AdDBrtAEQCCAzgJYCGA9AMoCmA9gK4A2pZLH3qALpA";

    expect(decodeProfile(fixedLink)).toEqual({
      year: 1995,
      month: 6,
      day: 15,
      calendar: "solar",
      isLeapMonth: false,
      hour: 12,
      minute: 0,
      gender: "unspecified",
      lat: 37.5,
      lng: 127,
      timeZone: "Asia/Seoul",
      placeLabel: "Seoul",
      placeLabelEn: "",
      dayBoundaryRule: "zi23",
    });
  });
```

Add a new test right after it for the 14-field format, using a fixed string verified during planning against this repo's actual `lz-string` version:

```ts
  it("decodes a fixed 14-field link including placeLabelEn", () => {
    const fixedLink =
      "NoRgnGCsA0Bs0hgBmikAmVWDMB2AdDBrtAEQCCAzgJYCGA9AMoCmA9gK4A2pZgOIOAdYz1IsO3VAF0gA";

    expect(decodeProfile(fixedLink)).toEqual({
      year: 1995,
      month: 6,
      day: 15,
      calendar: "solar",
      isLeapMonth: false,
      hour: 12,
      minute: 0,
      gender: "unspecified",
      lat: 37.5,
      lng: 127,
      timeZone: "Asia/Seoul",
      placeLabel: "서울",
      placeLabelEn: "Seoul",
      dayBoundaryRule: "zi23",
    });
  });
```

The round-trip test at the top of the file (`"round-trips the supported profile fields"`) needs no change — it spreads `...DEFAULT_PROFILE`, which now includes `placeLabelEn: "Seoul"` automatically, and `decodeProfile(encodeProfile(profile))` will round-trip it.

- [ ] **Step 4: Write `src/lib/__tests__/profile.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, placeDisplayLabel } from "../profile";

describe("placeDisplayLabel", () => {
  it("always returns the raw label for Korean locale, regardless of placeLabelEn", () => {
    expect(placeDisplayLabel("경기도 의정부시", "Uijeongbu-si, Gyeonggi-do", "ko")).toBe("경기도 의정부시");
    expect(placeDisplayLabel("경기도 의정부시", "", "ko")).toBe("경기도 의정부시");
  });

  it("uses placeLabelEn directly when present", () => {
    expect(placeDisplayLabel("경기도 의정부시", "Uijeongbu-si, Gyeonggi-do", "en")).toBe(
      "Uijeongbu-si, Gyeonggi-do",
    );
  });

  it("falls back to the legacy 16-preset table when placeLabelEn is missing", () => {
    expect(placeDisplayLabel("서울", "", "en")).toBe("Seoul");
    expect(placeDisplayLabel("시드니", "", "en")).toBe("Sydney");
  });

  it("falls back to the raw label when neither placeLabelEn nor a legacy entry exists", () => {
    expect(placeDisplayLabel("경기도 의정부시", "", "en")).toBe("경기도 의정부시");
  });

  it("keeps DEFAULT_PROFILE consistent with the legacy table", () => {
    expect(placeDisplayLabel(DEFAULT_PROFILE.placeLabel, DEFAULT_PROFILE.placeLabelEn, "en")).toBe("Seoul");
  });
});
```

- [ ] **Step 5: Update `ReportView`/`buildReportView` in `src/lib/reportModel.ts`**

Add one line to the `ReportView` interface right after `readonly placeLabel: string;` (around line 124):

```ts
  readonly placeLabel: string;
  readonly placeLabelEn: string;
```

Add one line to the returned object in `buildReportView` right after `placeLabel: profile.placeLabel,` (around line 438):

```ts
    placeLabel: profile.placeLabel,
    placeLabelEn: profile.placeLabelEn,
```

- [ ] **Step 6: Update the equivalent in `src/lib/astroModel.ts`**

Add to the `AstroView` interface right after `readonly placeLabel: string;` (around line 59):

```ts
  readonly placeLabel: string;
  readonly placeLabelEn: string;
```

Add to the builder's returned object right after `placeLabel: profile.placeLabel,` (around line 209):

```ts
    placeLabel: profile.placeLabel,
    placeLabelEn: profile.placeLabelEn,
```

- [ ] **Step 7: Update all six `placeDisplayLabel` call sites**

`src/app/r/[data]/page.tsx:230`:

```tsx
          {placeDisplayLabel(view.placeLabel, view.placeLabelEn, locale)} · {tBirthForm(genderKey)}
```

`src/app/r/[data]/opengraph-image.tsx:62`:

```ts
  const placeLabel = placeDisplayLabel(view.placeLabel, view.placeLabelEn, locale);
```

`src/app/r/[data]/astro/page.tsx:194`:

```tsx
          {placeDisplayLabel(view.placeLabel, view.placeLabelEn, locale)} · {t("navLabel")}
```

`src/app/r/[data]/all/page.tsx:131`:

```tsx
        <p className="mt-3 text-sm text-hobun-dim">{placeDisplayLabel(profile.placeLabel, profile.placeLabelEn, locale)}</p>
```

`src/app/compatibility/[left]/[right]/page.tsx:172-173`:

```tsx
            <p>{t("personA")}: {profileDate(leftProfile)} · {placeDisplayLabel(leftProfile.placeLabel, leftProfile.placeLabelEn, locale)}</p>
            <p>{t("personB")}: {profileDate(rightProfile)} · {placeDisplayLabel(rightProfile.placeLabel, rightProfile.placeLabelEn, locale)}</p>
```

- [ ] **Step 8: Run the full test suite and typecheck**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Expected: all tests PASS, no type errors. If `pnpm tsc --noEmit` flags a remaining `placeDisplayLabel` call with only two arguments, that's a seventh call site this plan missed — fix it using the same three-argument pattern before continuing.

- [ ] **Step 9: Commit**

```bash
git add src/lib/profile.ts src/lib/share.ts src/lib/reportModel.ts src/lib/astroModel.ts \
  "src/app/r/[data]/page.tsx" "src/app/r/[data]/opengraph-image.tsx" "src/app/r/[data]/astro/page.tsx" \
  "src/app/r/[data]/all/page.tsx" "src/app/compatibility/[left]/[right]/page.tsx" \
  src/lib/__tests__/profile.test.ts src/lib/__tests__/share.test.ts
git commit -m "feat: add placeLabelEn to StoredProfile and thread it through display call sites"
```

---

## Task 7: `LocationCombobox` 컴포넌트

**Files:**
- Create: `src/components/LocationCombobox.tsx`
- Modify: `messages/ko.json` (add 3 keys under `birthForm`)
- Modify: `messages/en.json` (add 3 keys under `birthForm`)

**Interfaces:**
- Consumes: `searchLocations`, `ensureWorldLocationsLoaded`, `isWorldLocationsLoaded`, `LocationSearchResult` (Task 5, `@/lib/locationSearch`); `resolveTimeZone` (Task 4, `@engine/shared/timezone`).
- Produces:
  ```ts
  export interface LocationComboboxProps {
    readonly id: string;
    readonly value: string; // current placeLabel, shown as the input's initial text
    readonly placeholder: string;
    readonly emptyLabel: string;
    readonly loadingLabel: string;
    readonly onSelect: (entry: { ko: string; en: string; lat: number; lng: number; timeZone: string }) => void;
  }
  export function LocationCombobox(props: LocationComboboxProps): JSX.Element;
  ```
  Consumed by Task 8 (`BirthForm`) and Task 9 (`CompatibilityForm`).

- [ ] **Step 1: Add the three new i18n keys**

In `messages/ko.json`, inside the `"birthForm"` object, add after `"placeNote"` (line 393):

```json
    "placeNote": "경도로 진태양시를 보정합니다.",
    "placeSearchPlaceholder": "지역이나 도시를 검색하세요 (예: 의정부, 파리)",
    "placeSearchEmpty": "일치하는 곳이 없습니다.",
    "placeSearchLoadingWorld": "해외 도시 목록을 불러오는 중입니다…",
```

In `messages/en.json`, inside the `"birthForm"` object, add after `"placeNote"` (line 393):

```json
    "placeNote": "Corrects true solar time using longitude.",
    "placeSearchPlaceholder": "Search a region or city (e.g. Uijeongbu, Paris)",
    "placeSearchEmpty": "No matching places.",
    "placeSearchLoadingWorld": "Loading overseas cities…",
```

- [ ] **Step 2: Write the component**

```tsx
// src/components/LocationCombobox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ensureWorldLocationsLoaded,
  isWorldLocationsLoaded,
  searchLocations,
  type LocationSearchResult,
} from "@/lib/locationSearch";
import { resolveTimeZone } from "@engine/shared/timezone";

export interface LocationComboboxProps {
  readonly id: string;
  readonly value: string;
  readonly placeholder: string;
  readonly emptyLabel: string;
  readonly loadingLabel: string;
  readonly onSelect: (entry: { ko: string; en: string; lat: number; lng: number; timeZone: string }) => void;
}

const fieldClass =
  "w-full border border-ink-700 bg-ink-850 px-3 py-2.5 font-mono text-sm text-hobun " +
  "transition-colors hover:border-ink-600 focus:border-hobun focus:outline-none";

function useSyncedQuery(initial: string) {
  const [value, setValue] = useState(initial);
  const lastInitial = useRef(initial);
  if (lastInitial.current !== initial) {
    lastInitial.current = initial;
    if (value !== initial) setValue(initial);
  }
  return { value, set: setValue };
}

export function LocationCombobox({ id, value, placeholder, emptyLabel, loadingLabel, onSelect }: LocationComboboxProps) {
  const listboxId = `${id}-listbox`;
  const query = useSyncedQuery(value);
  const [isOpen, setIsOpen] = useState(false);
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldReady, setWorldReady] = useState(isWorldLocationsLoaded());
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchLocations(query.value, 8), [query.value, worldReady]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleFocus() {
    setIsOpen(true);
    if (!isWorldLocationsLoaded()) {
      setWorldLoading(true);
      ensureWorldLocationsLoaded()
        .then(() => setWorldReady(true))
        .catch(() => {
          /* 검색은 국내 데이터만으로도 계속 동작한다 — 조용히 넘어간다. */
        })
        .finally(() => setWorldLoading(false));
    }
  }

  function selectResult(result: LocationSearchResult) {
    onSelect({
      ko: result.ko,
      en: result.en,
      lat: result.lat,
      lng: result.lng,
      timeZone: resolveTimeZone({ lat: result.lat, lng: result.lng }),
    });
    query.set(result.ko);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (isOpen && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        selectResult(results[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const showEmpty = isOpen && query.value.trim().length > 0 && results.length === 0 && !worldLoading;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query.value}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={(e) => {
          query.set(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={fieldClass}
      />
      {isOpen && (results.length > 0 || worldLoading || showEmpty) && (
        <ul id={listboxId} role="listbox" className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-ink-700 bg-ink-850">
          {results.map((result, index) => (
            <li
              key={`${result.lat},${result.lng}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus on the input through the click
                selectResult(result);
              }}
              className={`cursor-pointer px-3 py-2 font-mono text-sm ${
                index === activeIndex ? "bg-hobun/15 text-hobun" : "text-hobun-dim hover:bg-ink-800"
              }`}
            >
              {result.ko}
            </li>
          ))}
          {worldLoading && (
            <li className="px-3 py-2 text-xs text-hobun-faint" aria-live="polite">
              {loadingLabel}
            </li>
          )}
          {showEmpty && <li className="px-3 py-2 text-xs text-hobun-faint">{emptyLabel}</li>}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```

Expected: no errors (component isn't wired into any page yet, so this only checks the file compiles standalone).

- [ ] **Step 4: Commit**

```bash
git add src/components/LocationCombobox.tsx messages/ko.json messages/en.json
git commit -m "feat: add LocationCombobox search UI component"
```

---

## Task 8: `BirthForm.tsx` 연결

**Files:**
- Modify: `src/components/BirthForm.tsx:1-20, 293-322`

**Interfaces:**
- Consumes: `LocationCombobox` (Task 7).

- [ ] **Step 1: Update imports**

Replace the import block at the top (lines 6-19) — remove `PLACES` from the `@/lib/profile` import and add the new component:

```tsx
import { branchAt } from "@engine/saju";
import { LocationCombobox } from "@/components/LocationCombobox";
import {
  DEFAULT_PROFILE,
  clearProfile,
  getProfileServerSnapshot,
  getProfileSnapshot,
  saveProfile,
  subscribeProfile,
  type StoredProfile,
} from "@/lib/profile";
```

- [ ] **Step 2: Replace the place `<select>` block**

Replace lines 293-322 (the entire "태어난 곳" `<div>`) with:

```tsx
        <div>
          <label className={labelClass} htmlFor={`${uid}-place`}>
            {t("placeLabel")}
          </label>
          <LocationCombobox
            id={`${uid}-place`}
            value={profile.placeLabel}
            placeholder={t("placeSearchPlaceholder")}
            emptyLabel={t("placeSearchEmpty")}
            loadingLabel={t("placeSearchLoadingWorld")}
            onSelect={(entry) =>
              update({
                placeLabel: entry.ko,
                placeLabelEn: entry.en,
                lat: entry.lat,
                lng: entry.lng,
                timeZone: entry.timeZone,
              })
            }
          />
          <p className="mt-2 text-[13px] text-hobun-faint">{t("placeNote")}</p>
        </div>
```

- [ ] **Step 3: Run existing tests and typecheck**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Expected: no regressions. (There is no dedicated `BirthForm.test.tsx` today — this is verified through the saju/astro E2E specs in Task 11 and the existing `share`/`profile`/`reportModel` unit tests.)

- [ ] **Step 4: Manual smoke check with the dev server**

```bash
pnpm dev
```

Open `http://localhost:3000`, click into the 사주 card, type "의정부" into 태어난 곳, confirm "경기도 의정부시" appears as a suggestion and selecting it fills the field. Stop the dev server after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/components/BirthForm.tsx
git commit -m "feat: wire LocationCombobox into BirthForm, removing the 16-city preset select"
```

---

## Task 9: `CompatibilityForm.tsx` 연결

**Files:**
- Modify: `src/components/synastry/CompatibilityForm.tsx:1-11, 174-188`

**Interfaces:**
- Consumes: `LocationCombobox` (Task 7) — same integration pattern as Task 8, applied to the two-person synastry form.

- [ ] **Step 1: Read the current full file before editing**

Run:

```bash
sed -n '1,20p;160,200p' src/components/synastry/CompatibilityForm.tsx
```

Confirm the exact name currently in scope for (a) the unique person identifier used to build stable ids — the component destructures a `person: PersonKey` (or similarly named) parameter; use that exact name in Step 2's `id` prop, not a guess — and (b) whether `useTranslations("birthForm")` is already called anywhere in this file. This plan's steps below use `personKey` and `tBirthForm` as placeholders for those two names; replace them with whatever the actual file uses before applying the edit.

- [ ] **Step 2: Update imports**

Replace line 7:

```tsx
import { DEFAULT_PROFILE, type StoredProfile } from "@/lib/profile";
```

Add alongside the other imports (near line 1-10):

```tsx
import { LocationCombobox } from "@/components/LocationCombobox";
```

- [ ] **Step 3: Replace the place `<select>` block**

Replace lines 174-188 with (substituting the real identifier/translation-hook names found in Step 1 for `personKey`/`tBirthForm`):

```tsx
        <label className="block">
          <span className={labelClass}>{t("place")}</span>
          <LocationCombobox
            id={`${personKey}-place`}
            value={profile.placeLabel}
            placeholder={tBirthForm("placeSearchPlaceholder")}
            emptyLabel={tBirthForm("placeSearchEmpty")}
            loadingLabel={tBirthForm("placeSearchLoadingWorld")}
            onSelect={(entry) =>
              onPatch({
                placeLabel: entry.ko,
                placeLabelEn: entry.en,
                lat: entry.lat,
                lng: entry.lng,
                timeZone: entry.timeZone,
              })
            }
          />
        </label>
```

- [ ] **Step 4: Add the `tBirthForm` translations hook if not already present**

If Step 1 found no existing `useTranslations("birthForm")` call, add one near the component's other `useTranslations` call:

```tsx
  const tBirthForm = useTranslations("birthForm");
```

(`useTranslations` is already imported at line 3 for this component's own namespace — reuse the same import, just add a second call with the `"birthForm"` namespace.)

- [ ] **Step 5: Typecheck and run tests**

```bash
pnpm tsc --noEmit
pnpm vitest run
```

Expected: no errors, no regressions.

- [ ] **Step 6: Manual smoke check**

```bash
pnpm dev
```

Open `/compatibility`, confirm both person A and person B place fields use the new search box and a selection updates the form state (no console errors).

- [ ] **Step 7: Commit**

```bash
git add src/components/synastry/CompatibilityForm.tsx
git commit -m "feat: wire LocationCombobox into CompatibilityForm"
```

---

## Task 10: 계산 기록에 출생지 서사 + KST 환산 표시

**Files:**
- Modify: `src/lib/reportModel.ts:128-139, 442-452` (add `precision.kstLabel`)
- Modify: `src/app/r/[data]/page.tsx:320-347` (render the new sentence + conditional DataRow)
- Modify: `messages/ko.json`, `messages/en.json` (add 3 keys under `saju`)
- Test: `src/lib/__tests__/reportModel.test.ts` (extend existing)

**Interfaces:**
- Produces: `ReportView.precision.kstLabel: string | null`.
- Consumes: nothing new from earlier tasks — this works with any `StoredProfile`, domestic or overseas, old or new.

- [ ] **Step 1: Add the i18n keys**

In `messages/ko.json`, inside `"saju"`, add after `"labelTrueSolar": "진태양시",` (line 439):

```json
    "labelTrueSolar": "진태양시",
    "labelKst": "한국 표준시 환산",
    "placeCorrectionEarlier": "{place} 기준, 표준시보다 약 {minutes}분 이른 진태양시로 보정되었습니다.",
    "placeCorrectionLater": "{place} 기준, 표준시보다 약 {minutes}분 늦은 진태양시로 보정되었습니다.",
```

In `messages/en.json`, inside `"saju"`, add after `"labelTrueSolar": "True solar time",` (line 439):

```json
    "labelTrueSolar": "True solar time",
    "labelKst": "Korea Standard Time equivalent",
    "placeCorrectionEarlier": "Corrected to a true solar time about {minutes} minutes earlier than standard time, based on {place}.",
    "placeCorrectionLater": "Corrected to a true solar time about {minutes} minutes later than standard time, based on {place}.",
```

- [ ] **Step 2: Write the failing reportModel test**

Add to `src/lib/__tests__/reportModel.test.ts`:

```ts
  it("adds a Korea-Standard-Time equivalent only for non-Seoul timezones", () => {
    const seoulView = buildReportView(DEFAULT_PROFILE, new Date("2026-08-20T00:00:00Z"));
    expect(seoulView.precision.kstLabel).toBeNull();

    const sydneyProfile = {
      ...DEFAULT_PROFILE,
      lat: -33.8688,
      lng: 151.2093,
      timeZone: "Australia/Sydney",
      placeLabel: "시드니",
      placeLabelEn: "Sydney",
    };
    const sydneyView = buildReportView(sydneyProfile, new Date("2026-08-20T00:00:00Z"));
    expect(sydneyView.precision.kstLabel).not.toBeNull();
    expect(sydneyView.precision.kstLabel).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
pnpm vitest run src/lib/__tests__/reportModel.test.ts
```

Expected: FAIL — `kstLabel` doesn't exist on `precision` yet.

- [ ] **Step 4: Add `kstLabel` to `ReportView` and `buildReportView`**

In the `precision` block of the `ReportView` interface (around line 128-139), add a field:

```ts
  readonly precision: {
    readonly timeZone: string;
    readonly offsetLabel: string;
    readonly isDST: boolean;
    readonly clockLabel: string;
    readonly trueSolarLabel: string;
    /** null이면 출생지가 이미 한국 표준시(Asia/Seoul)를 쓴다는 뜻. */
    readonly kstLabel: string | null;
    readonly longitudeCorrectionMinutes: number;
    readonly equationOfTimeMinutes: number;
    readonly totalCorrectionMinutes: number;
    readonly timeUnknown: boolean;
  };
```

In `buildReportView` (around line 406-452), compute the value right before the `return`, and add it inside the existing `precision: {...}` object literal:

```ts
  const kstLabel =
    zone === "Asia/Seoul"
      ? null
      : DateTime.fromISO(result.time.instantISO, { zone: "Asia/Seoul" }).toFormat("yyyy-MM-dd HH:mm");

  return {
    // ...unchanged fields above...
    precision: {
      timeZone: zone,
      offsetLabel: offsetLabel(result.time.utcOffsetMinutes),
      isDST: result.time.isDST,
      clockLabel: local.toFormat("HH:mm"),
      trueSolarLabel: trueSolar.toFormat("HH:mm:ss"),
      kstLabel,
      longitudeCorrectionMinutes: result.time.longitudeCorrectionMinutes,
      equationOfTimeMinutes: result.time.equationOfTimeMinutes,
      totalCorrectionMinutes: result.time.totalCorrectionMinutes,
      timeUnknown: result.time.timeUnknown,
    },
    // ...unchanged fields below...
  };
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
pnpm vitest run src/lib/__tests__/reportModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Render the KST row and the place-correction sentence in the result page**

In `src/app/r/[data]/page.tsx`, inside the precision `<dl>` (around line 320-345), add a new `DataRow` right after the `labelTrueSolar` one:

```tsx
            <DataRow
              label={t("labelTrueSolar")}
              value={view.precision.trueSolarLabel}
              note={formatSignedMinutes(view.precision.totalCorrectionMinutes, minuteUnit)}
            />
            {view.precision.kstLabel && (
              <DataRow label={t("labelKst")} value={view.precision.kstLabel} />
            )}
```

Right after the `</dl>` closes and before the existing `calcNote` paragraph (around line 345-347), add the place-correction sentence:

```tsx
          </dl>

          <p className="mt-3 text-xs leading-relaxed text-hobun-faint">
            {t(view.precision.totalCorrectionMinutes < 0 ? "placeCorrectionEarlier" : "placeCorrectionLater", {
              place: placeDisplayLabel(view.placeLabel, view.placeLabelEn, locale),
              minutes: Math.round(Math.abs(view.precision.totalCorrectionMinutes)),
            })}
          </p>
          <p className="mt-5 text-xs leading-relaxed text-hobun-faint">{t("calcNote")}</p>
```

- [ ] **Step 7: Run the full test suite and typecheck**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Expected: all PASS, no type errors.

- [ ] **Step 8: Manual smoke check**

```bash
pnpm dev
```

Open a saju result for the default profile (Seoul) — confirm no "한국 표준시 환산" row appears, and the new sentence appears (Seoul's own longitude is close to but not exactly the 135°E standard meridian, so a small non-zero correction — already computed today, just newly narrated — is expected). Then submit a new profile with an overseas location via the new search box and confirm the KST row appears.

- [ ] **Step 9: Commit**

```bash
git add src/lib/reportModel.ts "src/app/r/[data]/page.tsx" messages/ko.json messages/en.json \
  src/lib/__tests__/reportModel.test.ts
git commit -m "feat: narrate birthplace true-solar-time correction and show KST equivalent for overseas births"
```

---

## Task 11: E2E 스모크 테스트

**Files:**
- Modify: `e2e/saju.spec.ts` (add one test to the existing `describe` block)

**Interfaces:**
- Consumes: the full stack from Tasks 1-10 running end-to-end in a real browser.

- [ ] **Step 1: Add the test**

Add to the `test.describe('Saju golden path (Korean locale)', ...)` block in `e2e/saju.spec.ts`, after the existing tests (before the closing `});` around line 126):

```ts
  test('searching a specific birthplace narrates the true-solar-time correction on the result', async ({ page, context }) => {
    await setLocaleCookie(context, 'ko');
    await page.goto('/');
    await dismissConsentBanner(page);
    await page.locator('#feature-hub').getByRole('heading', { name: '사주', exact: true, level: 3 }).click();

    const placeInput = page.getByRole('combobox', { name: '태어난 곳' });
    await placeInput.fill('의정부');
    await page.getByRole('option', { name: '경기도 의정부시' }).click();

    await page.getByRole('button', { name: '사주 원국 보기' }).click();
    await page.waitForURL(REPORT_URL_PATTERN);
    await dismissConsentBanner(page);

    await expect(page.getByText('경기도 의정부시', { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/경기도 의정부시 기준, 표준시보다 약 \d+분 (이른|늦은) 진태양시로 보정되었습니다\./)).toBeVisible();
  });
```

- [ ] **Step 2: Run it**

```bash
pnpm playwright test e2e/saju.spec.ts -g "searching a specific birthplace"
```

Expected: PASS. If `getByRole('combobox', { name: '태어난 곳' })` doesn't resolve, check that `LocationCombobox`'s `<input>` picks up the accessible name from the associated `<label htmlFor={id}>` in `BirthForm.tsx` (Task 8, Step 2) — the `id`/`htmlFor` pairing must match exactly.

- [ ] **Step 3: Run the related specs for regressions**

```bash
pnpm playwright test e2e/saju.spec.ts e2e/astro.spec.ts e2e/compatibility.spec.ts
```

Expected: all PASS — the default pre-filled profile (Seoul) still flows through unchanged for the other existing tests, since `LocationCombobox`'s initial `value` mirrors `profile.placeLabel` without requiring interaction.

- [ ] **Step 4: Commit**

```bash
git add e2e/saju.spec.ts
git commit -m "test: add e2e coverage for birthplace search and true-solar-time narration"
```

---

## Self-Review Notes

- **Spec coverage:** §4.1 domestic dataset → Task 1; overseas dataset → Task 2; combobox UI → Task 7; engine/state wiring + backward compat → Task 6; calc-record narrative → Task 10 Steps 1-6; KST → Task 10 Steps 4-6. Subordinate discoveries made during planning (CompatibilityForm sharing the preset, placeLabelEn) → Tasks 6 & 9. §9 test plan → Tasks 5, 6, 10, 11 cover locationSearch, profile/share backward-compat, reportModel, and one E2E smoke test. §4.2 exclusions (manual lat/lng, live geocoding, full city translation) are respected — no task introduces them.
- **Type consistency check:** `LocationEntry`/`LocationSearchResult` (Task 5) match the shape produced in Tasks 1-3 and consumed in Task 7's `onSelect`. `placeDisplayLabel`'s new 3-arg signature (Task 6) is used identically at all six call sites (Task 6 Step 7). `StoredProfile.placeLabelEn` (Task 6) is what `LocationCombobox.onSelect`'s `en` field feeds (Tasks 8-9) and what `ReportView`/`AstroView.placeLabelEn` mirrors (Task 6, Steps 5-6).
- **No placeholders:** every data-generation script's output was verified against real downloaded GeoNames data during planning (Task 1: 229 Korean entries, no duplicates, province counts matched; Task 2: 33,982 overseas entries after excluding KR, Tokyo/New York City spot-checked; Task 3: alias targets checked against the real generated dataset). Every code change in Tasks 4, 6, 7, 8, 10 is fully specified, not described abstractly. Task 9 has one explicit "read the file first, then substitute the real names" step (Step 1) because the exact local variable/prop names in `CompatibilityForm.tsx` for the person identifier and any existing `birthForm` translation hook were not fully confirmed during planning — this is flagged honestly rather than guessed.
