import { describe, expect, test } from "vitest";
import { buildArena } from "./polygon";
import { SIM_DT, sampleTrajectory, simulateRound } from "./simulate";
import type { StickSpec } from "./stick";

// 참가자 0: 골 라인 전체를 항상 덮는 스틱(절대 뚫리지 않음).
const alwaysBlocks: StickSpec = {
  bottomLengthRatio: 1,
  angleBDeg: 90,
  angleCDeg: 90,
  angleDDeg: 90,
  speed: 0,
  phaseOffset: 0,
};

// 참가자 1: 변의 맨 끝(골대 쪽)에 붙어 거의 아무것도 막지 못하는 스틱.
const barelyBlocks: StickSpec = {
  bottomLengthRatio: 0.001,
  angleBDeg: 90,
  angleCDeg: 90,
  angleDDeg: 90,
  speed: 0,
  phaseOffset: 0,
};

describe("simulateRound", () => {
  test("스틱이 덮지 않은 골 라인을 공이 통과하면 그 참가자가 탈락한다", () => {
    const arena = buildArena(2);
    // 왼쪽(참가자 1)을 향해 정면으로 발사한다.
    const plan = simulateRound(
      arena,
      [alwaysBlocks, barelyBlocks],
      { ballRadius: 0.04, ballSpeed: 0.2, startAngleRad: Math.PI },
      20
    );

    expect(plan).not.toBeNull();
    expect(plan?.eliminatedOwnerIndex).toBe(1);
  });

  test("스틱이 덮고 있는 골 라인에서는 튕겨 나가고 탈락하지 않는다", () => {
    const arena = buildArena(2);
    // 오른쪽(참가자 0, 항상 막힘)을 향해 정면으로 발사하면 반드시 튕겨야 한다.
    const plan = simulateRound(
      arena,
      [alwaysBlocks, barelyBlocks],
      { ballRadius: 0.04, ballSpeed: 0.2, startAngleRad: 0 },
      0.5
    );

    // 0.5초 동안은 오른쪽 벽에서 튕기기만 하고 아직 왼쪽까지 못 갔으므로 탈락이 없어야 한다.
    expect(plan).toBeNull();
  });

  test("막힌 벽에서 튕긴 뒤 반대편의 뚫린 골 라인으로 결국 탈락한다", () => {
    const arena = buildArena(2);
    const plan = simulateRound(
      arena,
      [alwaysBlocks, barelyBlocks],
      { ballRadius: 0.04, ballSpeed: 0.2, startAngleRad: 0 },
      20
    );

    expect(plan).not.toBeNull();
    expect(plan?.eliminatedOwnerIndex).toBe(1);
  });

  test("골대(꼭짓점) 근처로 향한 공은 통과하지 않고 튕겨 나간다", () => {
    const arena = buildArena(2);
    // 위쪽 골대 (0,-1)를 정면으로 겨냥한다. 골대는 항상 튕겨 내야 한다.
    const plan = simulateRound(
      arena,
      [alwaysBlocks, alwaysBlocks],
      { ballRadius: 0.04, ballSpeed: 0.2, startAngleRad: -Math.PI / 2 },
      1
    );

    expect(plan).toBeNull();
  });
});

describe("sampleTrajectory", () => {
  test("샘플 사이 시각은 선형 보간한다", () => {
    const trajectory = [
      { t: 0, x: 0, y: 0 },
      { t: SIM_DT, x: 1, y: 2 },
    ];
    const mid = sampleTrajectory(trajectory, SIM_DT / 2);
    expect(mid.x).toBeCloseTo(0.5, 5);
    expect(mid.y).toBeCloseTo(1, 5);
  });

  test("범위를 벗어난 시각은 양 끝 값으로 고정한다", () => {
    const trajectory = [
      { t: 0, x: 0, y: 0 },
      { t: SIM_DT, x: 1, y: 1 },
    ];
    expect(sampleTrajectory(trajectory, -1)).toEqual({ x: 0, y: 0 });
    expect(sampleTrajectory(trajectory, 100)).toEqual({ x: 1, y: 1 });
  });
});
