import { describe, expect, test } from "vitest";
import { createSeededRng } from "./random";
import {
  ANGLE_DEG_RANGE,
  BOTTOM_LENGTH_RATIO_RANGE,
  randomStickSpec,
  stickCenter,
  stickCoverage,
  stickQuadShape,
} from "./stick";

describe("randomStickSpec", () => {
  test("아랫면 길이 비율과 세 내각이 정해둔 범위 안에 있다", () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 50; i++) {
      const spec = randomStickSpec(rng);
      expect(spec.bottomLengthRatio).toBeGreaterThanOrEqual(BOTTOM_LENGTH_RATIO_RANGE[0]);
      expect(spec.bottomLengthRatio).toBeLessThanOrEqual(BOTTOM_LENGTH_RATIO_RANGE[1]);
      for (const angle of [spec.angleBDeg, spec.angleCDeg, spec.angleDDeg]) {
        expect(angle).toBeGreaterThanOrEqual(ANGLE_DEG_RANGE[0]);
        expect(angle).toBeLessThanOrEqual(ANGLE_DEG_RANGE[1]);
      }
    }
  });

  test("어떤 조합이든 자기교차 없는 유효한 사각형(옆변 길이가 모두 양수)이 나온다", () => {
    const rng = createSeededRng(5);
    for (let i = 0; i < 200; i++) {
      const spec = randomStickSpec(rng);
      const quad = stickQuadShape(spec, 1);
      expect(quad.v2.depth).toBeGreaterThan(0);
      expect(quad.v3.depth).toBeGreaterThan(0);
    }
  });
});

describe("stickCenter / stickCoverage", () => {
  const edgeLength = 1;

  test("방어 폭은 항상 아랫면 길이 비율 * 변 길이와 같다", () => {
    const spec = randomStickSpec(createSeededRng(2));
    const coverage = stickCoverage(spec, edgeLength, 1.23);
    expect(coverage.to - coverage.from).toBeCloseTo(spec.bottomLengthRatio * edgeLength, 10);
  });

  test("중심은 항상 변의 양 끝(골대 쪽)을 넘어가지 않는다", () => {
    const spec = randomStickSpec(createSeededRng(3));
    const halfWidth = (spec.bottomLengthRatio * edgeLength) / 2;
    for (let t = 0; t < 20; t += 0.1) {
      const center = stickCenter(spec, edgeLength, t);
      expect(center).toBeGreaterThanOrEqual(halfWidth - 1e-9);
      expect(center).toBeLessThanOrEqual(edgeLength - halfWidth + 1e-9);
    }
  });

  test("왕복 운동이므로 위상이 같으면 위치도 같다(주기성)", () => {
    const spec = { ...randomStickSpec(createSeededRng(4)), phaseOffset: 0 };
    const halfWidth = (spec.bottomLengthRatio * edgeLength) / 2;
    const travel = edgeLength - 2 * halfWidth;
    const period = (2 * travel) / (spec.speed * edgeLength);

    const a = stickCenter(spec, edgeLength, 0.37);
    const b = stickCenter(spec, edgeLength, 0.37 + period);
    expect(b).toBeCloseTo(a, 8);
  });
});
