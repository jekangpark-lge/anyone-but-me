import { describe, expect, test } from "vitest";
import { createSeededRng } from "./random";
import {
  BOTTOM_LENGTH_RATIO_RANGE,
  SIDE_LENGTH_RATIO_RANGE,
  randomStickSpec,
  stickCenter,
  stickCoverage,
} from "./stick";

describe("randomStickSpec", () => {
  test("아랫면 길이 비율과 옆면 길이 비율이 정해둔 범위 안에 있다", () => {
    const rng = createSeededRng(1);
    for (let i = 0; i < 50; i++) {
      const spec = randomStickSpec(rng);
      expect(spec.bottomLengthRatio).toBeGreaterThanOrEqual(BOTTOM_LENGTH_RATIO_RANGE[0]);
      expect(spec.bottomLengthRatio).toBeLessThanOrEqual(BOTTOM_LENGTH_RATIO_RANGE[1]);
      expect(spec.sideLengthRatio).toBeGreaterThanOrEqual(SIDE_LENGTH_RATIO_RANGE[0]);
      expect(spec.sideLengthRatio).toBeLessThanOrEqual(SIDE_LENGTH_RATIO_RANGE[1]);
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
