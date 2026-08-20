import { type Vec2, add, scale, sub, dot, length, reflect, fromAngle } from "./vector";
import type { Arena } from "./polygon";
import { type StickSpec, stickCoverage } from "./stick";

export interface StartCondition {
  ballRadius: number;
  ballSpeed: number;
  startAngleRad: number;
}

export interface TrajectorySample {
  t: number;
  x: number;
  y: number;
}

export interface RoundPlan {
  arena: Arena;
  /** arena.edges의 ownerIndex와 같은 순서의 스틱 스펙. */
  stickSpecs: StickSpec[];
  startCondition: StartCondition;
  trajectory: TrajectorySample[];
  durationSeconds: number;
  eliminatedOwnerIndex: number;
}

export const SIM_DT = 1 / 240;

/**
 * 주어진 시작조건으로 판을 끝까지(또는 maxSimSeconds까지) 미리 계산한다.
 * 스틱은 참가자별로 고정된 스펙에 따라 시간의 함수로 결정되므로,
 * 이 계산과 실제 화면 재생은 항상 같은 결과를 낸다.
 */
export function simulateRound(
  arena: Arena,
  stickSpecs: StickSpec[],
  startCondition: StartCondition,
  maxSimSeconds: number
): RoundPlan | null {
  let pos: Vec2 = { x: 0, y: 0 };
  let vel: Vec2 = scale(fromAngle(startCondition.startAngleRad), startCondition.ballSpeed);
  const trajectory: TrajectorySample[] = [{ t: 0, x: pos.x, y: pos.y }];

  let t = 0;
  const maxSteps = Math.ceil(maxSimSeconds / SIM_DT);

  for (let step = 0; step < maxSteps; step++) {
    const result = advance(pos, vel, arena, stickSpecs, t, SIM_DT, startCondition.ballRadius);
    pos = result.pos;
    vel = result.vel;
    t += SIM_DT;
    trajectory.push({ t, x: pos.x, y: pos.y });

    if (result.eliminatedOwnerIndex !== null) {
      return {
        arena,
        stickSpecs,
        startCondition,
        trajectory,
        durationSeconds: t,
        eliminatedOwnerIndex: result.eliminatedOwnerIndex,
      };
    }
  }

  return null;
}

interface AdvanceResult {
  pos: Vec2;
  vel: Vec2;
  eliminatedOwnerIndex: number | null;
}

function advance(
  pos: Vec2,
  vel: Vec2,
  arena: Arena,
  stickSpecs: StickSpec[],
  t: number,
  dt: number,
  ballRadius: number
): AdvanceResult {
  const newPos = add(pos, scale(vel, dt));

  for (const vertex of arena.vertices) {
    const toVertex = sub(newPos, vertex);
    const dist = length(toVertex);
    if (dist <= ballRadius + arena.vertexRadius) {
      const n = dist > 0 ? scale(toVertex, 1 / dist) : { x: 1, y: 0 };
      // 이미 표면에서 멀어지는 중이면 다시 반사시키지 않는다(그러지 않으면
      // 경계에 붙어 매 스텝 반사만 반복하며 갇히는 문제가 생긴다).
      if (dot(vel, n) >= 0) continue;
      return {
        pos: add(vertex, scale(n, ballRadius + arena.vertexRadius)),
        vel: reflect(vel, n),
        eliminatedOwnerIndex: null,
      };
    }
  }

  for (const edge of arena.edges) {
    const signedDistance = dot(sub(newPos, edge.a), edge.outwardNormal);
    if (signedDistance < -ballRadius) continue;
    // 이미 안쪽으로 멀어지는 중이면(막 튕겨 나온 직후 등) 다시 반사시키지 않는다.
    if (dot(vel, edge.outwardNormal) <= 0) continue;

    const along = dot(sub(newPos, edge.a), edge.direction);
    const margin = arena.vertexRadius;
    if (along < margin || along > edge.length - margin) continue;

    const isCovered =
      edge.ownerIndex === null ||
      isWithinCoverage(along, stickCoverage(stickSpecs[edge.ownerIndex], edge.length, t));

    if (isCovered) {
      return {
        pos: sub(newPos, scale(edge.outwardNormal, signedDistance - ballRadius)),
        vel: reflect(vel, edge.outwardNormal),
        eliminatedOwnerIndex: null,
      };
    }

    return { pos: newPos, vel, eliminatedOwnerIndex: edge.ownerIndex };
  }

  return { pos: newPos, vel, eliminatedOwnerIndex: null };
}

function isWithinCoverage(along: number, coverage: { from: number; to: number }): boolean {
  return along >= coverage.from && along <= coverage.to;
}

/** 재생 중 경과 시간(초)에 해당하는 공 위치를 궤적에서 찾아 보간한다. */
export function sampleTrajectory(trajectory: TrajectorySample[], t: number): Vec2 {
  const clamped = Math.min(Math.max(t, 0), trajectory[trajectory.length - 1].t);
  const index = Math.min(
    trajectory.length - 2,
    Math.max(0, Math.floor(clamped / SIM_DT))
  );
  const a = trajectory[index];
  const b = trajectory[index + 1];
  const span = b.t - a.t;
  const ratio = span > 0 ? (clamped - a.t) / span : 0;
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}
