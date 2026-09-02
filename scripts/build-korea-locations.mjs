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
