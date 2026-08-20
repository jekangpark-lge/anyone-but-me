import { describe, expect, test } from "vitest";
import { fromAngle, length, reflect } from "./vector";

describe("reflect", () => {
  test("수직으로 벽에 부딪히면 정확히 반대 방향으로 튕긴다", () => {
    const v = { x: 1, y: 0 };
    const n = { x: 1, y: 0 };
    const result = reflect(v, n);
    expect(result.x).toBeCloseTo(-1, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });

  test("입사각과 반사각이 같다(법선 기준 대칭)", () => {
    const v = fromAngle(Math.PI / 6); // 법선(1,0) 기준 30도로 들어옴
    const n = { x: 1, y: 0 };
    const result = reflect(v, n);

    // 법선 방향 성분은 부호만 바뀌고, 접선 방향 성분은 그대로 유지된다.
    expect(result.y).toBeCloseTo(v.y, 10);
    expect(result.x).toBeCloseTo(-v.x, 10);
  });

  test("반사 전후 속력(크기)이 보존된다", () => {
    const v = { x: 0.37, y: -1.21 };
    const n = { x: 0, y: 1 };
    const result = reflect(v, n);
    expect(length(result)).toBeCloseTo(length(v), 10);
  });
});
