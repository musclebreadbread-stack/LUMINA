/**
 * 결정론적 시드 난수.
 *
 * 타로·오늘의 운세처럼 "같은 입력이면 언제나 같은 결과"가 필요한 두 엔진 이상이
 * 쓰게 되어 여기로 올렸다. 엔진은 이 모듈 밖에서 Math.random 이나 현재 시각을
 * 읽지 않는다 — 시드는 언제나 호출부(사주의 referenceDate, 타로의 seed, 오늘의
 * 운세의 date)가 만들어 넘긴다.
 */

/** 문자열 시드 → 32비트 정수. FNV-1a. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — 빠르고 시드마다 충분히 갈라지는 결정론적 PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 시드 문자열 → [0,1) 난수를 내는 함수. 같은 시드는 언제나 같은 수열을 낸다. */
export function rngFromSeed(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

/** rng()로 배열에서 결정론적으로 하나를 고른다. */
export function pick<T>(items: readonly T[], rng: () => number): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new RangeError("pick() called with an empty array");
  return item;
}
