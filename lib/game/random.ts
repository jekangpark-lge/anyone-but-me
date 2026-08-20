export type Rng = () => number;

/** 실제 게임에서 쓰는 무작위 소스. */
export const defaultRng: Rng = Math.random;

/** 결정적 테스트를 위한 시드 기반 PRNG (mulberry32). */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randomInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return Math.floor(randomInRange(rng, minInclusive, maxInclusive + 1));
}
