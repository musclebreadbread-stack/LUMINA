import { computeAspects, type Aspect } from "@engine/astro/aspects";
import { PLANETS, signOfLongitude, type PlanetKey, type ZodiacSign } from "@engine/astro/constants";
import { planetPosition, type PlanetPosition } from "@engine/astro/positions";
import { daysInGregorianMonth } from "@engine/shared/birth";
import { resolveInstant } from "@engine/shared/time";

export interface ReferenceDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface DailySky {
  readonly date: string;
  readonly instant: Date;
  readonly timeZone: string;
  readonly positions: readonly PlanetPosition[];
  readonly aspects: readonly Aspect[];
}

const SKY_CACHE_LIMIT = 128;
const skyCache = new Map<string, DailySky>();

/** Parse the public YYYY-MM-DD token used by the deterministic daily route. */
export function parseReferenceDate(date: string): ReferenceDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`invalid reference date: ${date}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) {
    throw new RangeError(`reference date outside supported range: ${date}`);
  }
  if (day < 1 || day > daysInGregorianMonth(year, month)) {
    throw new RangeError(`invalid reference date: ${date}`);
  }

  return Object.freeze({ year, month, day });
}

/** Use UTC noon so the shallow route has no dependency on server wall-clock time. */
export function referenceInstantAtUtcNoon(date: string): Date {
  const parsed = parseReferenceDate(date);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0, 0));
}

function computeSkyAt(date: string, instant: Date, timeZone: string): DailySky {
  const positions = Object.freeze(
    PLANETS.map(({ key }) => planetPosition(key, instant)),
  );

  return Object.freeze({
    date,
    instant,
    timeZone,
    positions,
    aspects: computeAspects(positions),
  });
}

function cachedSky(key: string, factory: () => DailySky): DailySky {
  const cached = skyCache.get(key);
  if (cached) return cached;

  const computed = factory();
  skyCache.set(key, computed);
  if (skyCache.size > SKY_CACHE_LIMIT) {
    const oldest = skyCache.keys().next().value;
    if (oldest !== undefined) skyCache.delete(oldest);
  }
  return computed;
}

export function computeDailySky(date: string): DailySky {
  return cachedSky(`${date}|UTC`, () => computeSkyAt(date, referenceInstantAtUtcNoon(date), "UTC"));
}

export function computeDailySkyAtTimeZone(date: string, timeZone: string): DailySky {
  return cachedSky(`${date}|${timeZone}`, () => {
    const parsed = parseReferenceDate(date);
    const resolved = resolveInstant(parsed, { hour: 12, minute: 0 }, timeZone);
    return computeSkyAt(date, resolved.instant, timeZone);
  });
}

export function skyPositionOf(sky: DailySky, key: PlanetKey): PlanetPosition {
  const position = sky.positions.find((item) => item.key === key);
  if (!position) throw new RangeError(`missing sky position: ${key}`);
  return position;
}

export function skySignOf(sky: DailySky, key: PlanetKey): ZodiacSign {
  return signOfLongitude(skyPositionOf(sky, key).longitude);
}
