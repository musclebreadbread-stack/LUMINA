import { separationOf, type Aspect } from "@engine/astro/aspects";
import { ASPECTS, planetDef, type AspectDef, type PlanetKey } from "@engine/astro/constants";
import { skyPositionOf, skySignOf, type DailySky } from "./sky";

export interface TransitSnapshot {
  readonly moonSignIndex: number;
  readonly sunSignIndex: number;
  readonly marsSignIndex: number;
  readonly mercuryRetrograde: boolean;
  readonly aspects: readonly Aspect[];
}

export interface NatalTransitAspect {
  readonly transit: PlanetKey;
  readonly natal: PlanetKey;
  readonly def: AspectDef;
  readonly orb: number;
  readonly strength: number;
}

export function computeTransits(sky: DailySky): TransitSnapshot {
  return Object.freeze({
    moonSignIndex: skySignOf(sky, "moon").index,
    sunSignIndex: skySignOf(sky, "sun").index,
    marsSignIndex: skySignOf(sky, "mars").index,
    mercuryRetrograde: skyPositionOf(sky, "mercury").retrograde,
    aspects: sky.aspects,
  });
}

export function aspectBetween(
  sky: DailySky,
  first: PlanetKey,
  second: PlanetKey,
): { readonly separation: number; readonly aspect: Aspect | null } {
  const separation = separationOf(
    skyPositionOf(sky, first).longitude,
    skyPositionOf(sky, second).longitude,
  );
  const aspect = sky.aspects.find(
    (candidate) =>
      (candidate.a === first && candidate.b === second) ||
      (candidate.a === second && candidate.b === first),
  ) ?? null;

  return Object.freeze({ separation, aspect });
}

export function computeNatalTransitAspects(
  sky: DailySky,
  natalPositions: readonly { readonly key: PlanetKey; readonly longitude: number }[],
): readonly NatalTransitAspect[] {
  const found: NatalTransitAspect[] = [];

  for (const transit of sky.positions) {
    for (const natal of natalPositions) {
      const separation = separationOf(transit.longitude, natal.longitude);
      const luminary = planetDef(transit.key).isLuminary || planetDef(natal.key).isLuminary;
      for (const def of ASPECTS) {
        const allowed = def.orb + (luminary ? 2 : 0);
        const orb = Math.abs(separation - def.angle);
        if (orb <= allowed) {
          found.push(
            Object.freeze({
              transit: transit.key,
              natal: natal.key,
              def,
              orb,
              strength: 1 - orb / allowed,
            }),
          );
          break;
        }
      }
    }
  }

  return Object.freeze(found.sort((left, right) => right.strength - left.strength));
}
