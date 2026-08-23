import { ASPECTS, norm360, planetDef, type AspectDef, type PlanetKey } from "./constants";

/**
 * 각(aspect) 판정.
 *
 * 두 천체의 황경 차이가 정해진 각도에 허용 오차(orb) 안으로 들어오면 각이 맺힌다.
 * 해와 달은 해석에서 비중이 커서 오차를 2도 넓게 잡는다 — 유파마다 다른 관행이라
 * 값을 옵션으로 노출하고 기본값을 문서에 남긴다.
 */

export interface Aspect {
  readonly a: PlanetKey;
  readonly b: PlanetKey;
  readonly def: AspectDef;
  /** 정확한 각도에서 얼마나 벗어났는지 (도, 절댓값) */
  readonly orb: number;
  /** 두 천체의 실제 각거리 (도, 0~180) */
  readonly separation: number;
  /** 오차가 작을수록 1에 가깝다 */
  readonly strength: number;
}

export interface AspectOptions {
  /** 해·달이 낄 때 더해 주는 오차 (도). 기본 2. */
  readonly luminaryBonus?: number;
}

/** 두 황경 사이의 각거리 (0~180). */
export function separationOf(lonA: number, lonB: number): number {
  const diff = norm360(lonA - lonB);
  return diff > 180 ? 360 - diff : diff;
}

export function computeAspects(
  positions: readonly { readonly key: PlanetKey; readonly longitude: number }[],
  options: AspectOptions = {},
): readonly Aspect[] {
  const bonus = options.luminaryBonus ?? 2;
  const found: Aspect[] = [];

  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i]!;
      const b = positions[j]!;
      const separation = separationOf(a.longitude, b.longitude);
      const luminary = planetDef(a.key).isLuminary || planetDef(b.key).isLuminary;

      for (const def of ASPECTS) {
        const allowed = def.orb + (luminary ? bonus : 0);
        const orb = Math.abs(separation - def.angle);
        if (orb <= allowed) {
          found.push(
            Object.freeze({
              a: a.key,
              b: b.key,
              def,
              orb,
              separation,
              strength: 1 - orb / allowed,
            }),
          );
          break; // 한 쌍은 하나의 각만 맺는다 — 각도가 서로 겹치지 않기 때문이다.
        }
      }
    }
  }

  // 정확한 각에 가까운 것부터 보여 준다.
  return Object.freeze([...found].sort((x, y) => x.orb - y.orb));
}
