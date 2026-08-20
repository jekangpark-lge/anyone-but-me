import { type Rng, randomInRange } from "./random";

export interface StickSpec {
  /** 아랫면(방어 폭) 길이 비율. 변 길이에 대한 비율(0~1)이며 방어 범위를 정한다. */
  bottomLengthRatio: number;
  /** 왼쪽 아래 내각(도, 아랫면과 왼쪽 옆면 사이). */
  angleBDeg: number;
  /** 왼쪽 위 내각(도, 왼쪽 옆면과 윗면 사이의 꺾임). */
  angleCDeg: number;
  /** 꼭짓점 내각(도, 윗면과 오른쪽 옆면 사이). */
  angleDDeg: number;
  /** 왕복 이동 속도. 변 길이에 대한 비율/초. */
  speed: number;
  /** 왕복 주기 안에서의 시작 위상(0~1). */
  phaseOffset: number;
}

export const BOTTOM_LENGTH_RATIO_RANGE = [0.28, 0.44] as const;
/** b, c, d 세 내각의 무작위 범위(도). 이 범위 안에서는 왼쪽·오른쪽 옆면 길이가
 * 항상 양수인 유효한(자기교차 없는) 사각형이 나온다. */
export const ANGLE_DEG_RANGE = [82, 98] as const;
const SPEED_RANGE = [0.4, 1.0] as const;
/** 왼쪽 옆면 길이 = 아랫면 길이 * 이 비율(고정값). 사각형은 아랫면 길이(a)와
 * 내각 3개(b,c,d)만으로는 하나로 정해지지 않고 변 길이 하나가 더 있어야 닫히므로,
 * 그 값을 이 비율로 고정해서 무작위 변수는 4개(a,b,c,d)로 유지한다. */
const LEFT_SIDE_LENGTH_RATIO = 0.4;

export function randomStickSpec(rng: Rng): StickSpec {
  const bottomLengthRatio = randomInRange(
    rng,
    BOTTOM_LENGTH_RATIO_RANGE[0],
    BOTTOM_LENGTH_RATIO_RANGE[1]
  );

  return {
    bottomLengthRatio,
    angleBDeg: randomInRange(rng, ANGLE_DEG_RANGE[0], ANGLE_DEG_RANGE[1]),
    angleCDeg: randomInRange(rng, ANGLE_DEG_RANGE[0], ANGLE_DEG_RANGE[1]),
    angleDDeg: randomInRange(rng, ANGLE_DEG_RANGE[0], ANGLE_DEG_RANGE[1]),
    speed: randomInRange(rng, SPEED_RANGE[0], SPEED_RANGE[1]),
    phaseOffset: rng(),
  };
}

/** 변 로컬 좌표(0~edgeLength)에서, 시각 t(초)일 때 스틱 중심 위치. */
export function stickCenter(spec: StickSpec, edgeLength: number, t: number): number {
  const halfWidth = (spec.bottomLengthRatio * edgeLength) / 2;
  const travel = Math.max(edgeLength - 2 * halfWidth, 0);
  if (travel === 0) return edgeLength / 2;

  const actualSpeed = spec.speed * edgeLength;
  // 속도가 0이면(정지한 스틱) 왕복 주기가 없으므로, 위상만으로 고정 위치를 정한다.
  if (actualSpeed === 0) return halfWidth + spec.phaseOffset * travel;

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

export interface LocalPoint {
  /** 변을 따라가는 축. */
  along: number;
  /** 골 라인(변)에서 아레나 안쪽으로 들어가는 축(0 이상). */
  depth: number;
}

export interface StickQuad {
  /** 왼쪽 아래(아랫면 왼쪽 끝). */
  v0: LocalPoint;
  /** 오른쪽 아래(아랫면 오른쪽 끝). */
  v1: LocalPoint;
  /** 꼭짓점(윗면과 오른쪽 옆면이 만나는 자리). */
  v2: LocalPoint;
  /** 왼쪽 위 꺾임(왼쪽 옆면과 윗면이 만나는 자리). */
  v3: LocalPoint;
}

/**
 * 스틱 모양을 이루는 사각형의 네 꼭짓점을, 변 로컬 좌표(along: 변을 따라가는
 * 축, depth: 변에서 아레나 안쪽으로 들어가는 축)로 계산한다. along은 스틱
 * 중심(0)을 기준으로 한 상대 좌표이며, 실제 위치로 옮기려면 stickCenter만큼
 * 더해야 한다.
 *
 * 아랫면(v0-v1, 길이 a)은 항상 골 라인(depth 0)에서 수평이다. 왼쪽 아래(b),
 * 왼쪽 위 꺾임(c), 꼭짓점(d) 세 내각과 a로 나머지 두 변의 길이·방향이 정해져
 * 사각형이 하나로 닫힌다(사각형 내각의 합은 360°이므로 나머지 한 내각은
 * 자동으로 정해진다).
 */
export function stickQuadShape(spec: StickSpec, edgeLength: number): StickQuad {
  const a = spec.bottomLengthRatio * edgeLength;
  const angleE = 360 - spec.angleBDeg - spec.angleCDeg - spec.angleDDeg;

  const v0: LocalPoint = { along: -a / 2, depth: 0 };
  const v1: LocalPoint = { along: a / 2, depth: 0 };

  // v0→v1 방향을 0°로 두고, 내각만큼씩 왼쪽으로 꺾어가며 나머지 변의 방향을 구한다.
  const theta2 = 180 - angleE; // v1→v2
  const theta3 = theta2 + (180 - spec.angleDDeg); // v2→v3
  const theta4 = theta3 + (180 - spec.angleCDeg); // v3→v0

  const dir2 = direction(theta2);
  const dir3 = direction(theta3);
  const dir4 = direction(theta4);

  const leftLength = a * LEFT_SIDE_LENGTH_RATIO;
  const v3: LocalPoint = {
    along: v0.along - leftLength * dir4.along,
    depth: v0.depth - leftLength * dir4.depth,
  };

  // v1에서 dir2 방향, v3에서 -dir3 방향으로 각각 나아가 만나는 점이 v2다.
  // (dir2·L2 = (v3-v1) - dir3·L3 라는 관계에서, L3을 지우면 L2를 바로 구할 수 있다.)
  const rhsAlong = v3.along - v1.along;
  const rhsDepth = v3.depth - v1.depth;
  const det = dir2.along * dir3.depth - dir3.along * dir2.depth;
  const rightLength = (rhsAlong * dir3.depth - dir3.along * rhsDepth) / det;

  const v2: LocalPoint = {
    along: v1.along + rightLength * dir2.along,
    depth: v1.depth + rightLength * dir2.depth,
  };

  return { v0, v1, v2, v3 };
}

function direction(angleDeg: number): LocalPoint {
  const rad = (angleDeg * Math.PI) / 180;
  return { along: Math.cos(rad), depth: Math.sin(rad) };
}

function mod(value: number, m: number): number {
  return ((value % m) + m) % m;
}
