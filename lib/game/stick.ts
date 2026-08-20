import { type Rng, randomInRange } from "./random";

export interface StickSpec {
  /** 윗면 각도(도). 시각적 형태에만 쓰이며 물리에는 영향을 주지 않는다. */
  topAngleDeg: number;
  /** 아랫면(방어 폭) 길이 비율. 변 길이에 대한 비율(0~1)이며 방어 범위를 정한다. */
  bottomLengthRatio: number;
  /** 좌우 옆면 길이 비율. 시각적 형태에만 쓰이며 최소·최대 범위 안에서 정해진다. */
  sideLengthRatio: number;
  /** 왕복 이동 속도. 변 길이에 대한 비율/초. */
  speed: number;
  /** 왕복 주기 안에서의 시작 위상(0~1). */
  phaseOffset: number;
}

export const BOTTOM_LENGTH_RATIO_RANGE = [0.18, 0.34] as const;
const TOP_ANGLE_DEG_RANGE = [-25, 25] as const;
const SPEED_RANGE = [0.4, 1.0] as const;
export const SIDE_LENGTH_RATIO_RANGE = [0.06, 0.16] as const;

export function randomStickSpec(rng: Rng): StickSpec {
  const topAngleDeg = randomInRange(rng, TOP_ANGLE_DEG_RANGE[0], TOP_ANGLE_DEG_RANGE[1]);
  const bottomLengthRatio = randomInRange(
    rng,
    BOTTOM_LENGTH_RATIO_RANGE[0],
    BOTTOM_LENGTH_RATIO_RANGE[1]
  );
  const rawSideLengthRatio = bottomLengthRatio * 0.4 + (Math.abs(topAngleDeg) / 90) * 0.3;
  const sideLengthRatio = clamp(
    rawSideLengthRatio,
    SIDE_LENGTH_RATIO_RANGE[0],
    SIDE_LENGTH_RATIO_RANGE[1]
  );

  return {
    topAngleDeg,
    bottomLengthRatio,
    sideLengthRatio,
    speed: randomInRange(rng, SPEED_RANGE[0], SPEED_RANGE[1]),
    phaseOffset: rng(),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 변 로컬 좌표(0~edgeLength)에서, 시각 t(초)일 때 스틱 중심 위치. */
export function stickCenter(spec: StickSpec, edgeLength: number, t: number): number {
  const halfWidth = (spec.bottomLengthRatio * edgeLength) / 2;
  const travel = Math.max(edgeLength - 2 * halfWidth, 0);
  if (travel === 0) return edgeLength / 2;

  const actualSpeed = spec.speed * edgeLength;
  const period = (2 * travel) / actualSpeed;
  const phaseTime = mod(t + spec.phaseOffset * period, period);
  const half = period / 2;
  const distanceFromStart = actualSpeed * (phaseTime <= half ? phaseTime : period - phaseTime);

  return halfWidth + distanceFromStart;
}

export interface Coverage {
  from: number;
  to: number;
}

/** 변 로컬 좌표(0~edgeLength)에서, 시각 t(초)일 때 스틱이 방어하는 구간. */
export function stickCoverage(spec: StickSpec, edgeLength: number, t: number): Coverage {
  const halfWidth = (spec.bottomLengthRatio * edgeLength) / 2;
  const center = stickCenter(spec, edgeLength, t);
  return { from: center - halfWidth, to: center + halfWidth };
}

function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}
