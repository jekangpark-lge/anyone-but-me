import { describe, expect, test } from "vitest";
import { roundedPolygonPath, stickLocalCorners } from "./stickShape";

describe("stickLocalCorners", () => {
  const rectSpec = {
    bottomLengthRatio: 0.2,
    angleBDeg: 90,
    angleCDeg: 90,
    angleDDeg: 90,
    speed: 0,
    phaseOffset: 0,
  };

  test("아랫면은 골 라인(depth 0)에, 윗면은 안쪽에 놓인다", () => {
    const corners = stickLocalCorners(rectSpec, 1, 0.5);
    const [bl, br, tr, tl] = corners;

    expect(bl.depth).toBe(0);
    expect(br.depth).toBe(0);
    expect(tr.depth).toBeGreaterThan(0);
    expect(tl.depth).toBeCloseTo(tr.depth, 10);
    expect(br.along - bl.along).toBeCloseTo(0.2, 10);
  });

  test("세 내각이 모두 직각이면 아랫면과 윗면이 정확히 같은 위치에서 시작한다(기울기 없는 직사각형)", () => {
    const corners = stickLocalCorners(rectSpec, 1, 0.5);
    const [bl, , , tl] = corners;
    expect(tl.along).toBeCloseTo(bl.along, 10);
  });
});

describe("roundedPolygonPath", () => {
  test("사각형에 대해 유효한 SVG path 문자열을 만든다", () => {
    const path = roundedPolygonPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      1
    );
    expect(path.startsWith("M")).toBe(true);
    expect(path.trim().endsWith("Z")).toBe(true);
  });
});
