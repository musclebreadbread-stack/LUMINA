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
