import type { Arena } from "./polygon";
import { type Rng, defaultRng, randomInRange } from "./random";
import { type RoundPlan, type StartCondition, simulateRound } from "./simulate";
import type { StickSpec } from "./stick";

export const TARGET_DURATION_RANGE = [5, 10] as const;

const BALL_RADIUS_RANGE = [0.035, 0.05] as const;
const BALL_SPEED_RANGE = [0.3, 1.2] as const;
const MAX_ATTEMPTS = 400;
const MAX_SIM_SECONDS = 20;
const YIELD_EVERY_N_ATTEMPTS = 16;

export interface PlanRoundOptions {
  rng?: Rng;
  targetRange?: readonly [number, number];
  maxAttempts?: number;
}

/**
 * 목표 진행 시간(5~10초) 안에 끝나는 시작조건을 찾을 때까지 판을 미리 계산한다.
 * 계산이 눈에 띄게 오래 걸릴 수 있어(드묾) 일정 시도마다 이벤트 루프에 양보하므로,
 * 호출 측이 로딩 상태를 화면에 반영할 시간을 가질 수 있다.
 */
export async function planRound(
  arena: Arena,
  stickSpecs: StickSpec[],
  options: PlanRoundOptions = {}
): Promise<RoundPlan> {
  const rng = options.rng ?? defaultRng;
  const targetRange = options.targetRange ?? TARGET_DURATION_RANGE;
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const targetMid = (targetRange[0] + targetRange[1]) / 2;

  let closest: { plan: RoundPlan; distance: number } | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = randomStartCondition(rng);
    const plan = simulateRound(arena, stickSpecs, candidate, MAX_SIM_SECONDS);

    if (plan && plan.durationSeconds >= targetRange[0] && plan.durationSeconds <= targetRange[1]) {
      return plan;
    }

    if (plan) {
      const distance = Math.abs(plan.durationSeconds - targetMid);
      if (!closest || distance < closest.distance) {
        closest = { plan, distance };
      }
    }

    if (attempt % YIELD_EVERY_N_ATTEMPTS === YIELD_EVERY_N_ATTEMPTS - 1) {
      await yieldToEventLoop();
    }
  }

  if (closest) return closest.plan;

  // 극단적으로 후보를 찾지 못한 경우의 안전망: 시간 제한을 넉넉히 늘려 한 번 더 시도한다.
  const fallbackPlan = simulateRound(arena, stickSpecs, randomStartCondition(rng), MAX_SIM_SECONDS * 3);
  if (fallbackPlan) return fallbackPlan;

  throw new Error("판 시작조건을 찾지 못했습니다.");
}

function randomStartCondition(rng: Rng): StartCondition {
  return {
    ballRadius: randomInRange(rng, BALL_RADIUS_RANGE[0], BALL_RADIUS_RANGE[1]),
    ballSpeed: randomInRange(rng, BALL_SPEED_RANGE[0], BALL_SPEED_RANGE[1]),
    startAngleRad: randomInRange(rng, 0, Math.PI * 2),
  };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
