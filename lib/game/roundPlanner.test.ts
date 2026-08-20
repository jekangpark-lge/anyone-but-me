import { describe, expect, test } from "vitest";
import { buildArena } from "./polygon";
import { createSeededRng } from "./random";
import { TARGET_DURATION_RANGE, planRound } from "./roundPlanner";
import { randomStickSpec } from "./stick";

describe("planRound", () => {
  test.each([2, 3, 5, 8])(
    "참가자 %i명일 때 목표 진행 시간(5~10초) 안에 끝나는 시작조건을 찾아낸다",
    async (n) => {
      const rng = createSeededRng(n * 1000 + 1);
      const arena = buildArena(n);
      const stickSpecs = Array.from({ length: n }, () => randomStickSpec(rng));

      const plan = await planRound(arena, stickSpecs, { rng });

      expect(plan.durationSeconds).toBeGreaterThanOrEqual(TARGET_DURATION_RANGE[0]);
      expect(plan.durationSeconds).toBeLessThanOrEqual(TARGET_DURATION_RANGE[1]);
      expect(plan.eliminatedOwnerIndex).toBeGreaterThanOrEqual(0);
      expect(plan.eliminatedOwnerIndex).toBeLessThan(n);
    }
  );
});
