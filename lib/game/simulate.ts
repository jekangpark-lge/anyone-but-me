import { type Vec2, add, scale, sub, dot, length, reflect, fromAngle } from "./vector";
import type { Arena, Edge } from "./polygon";
import { type StickSpec, type StickQuad, stickCenter, stickCoverage, stickQuadShape } from "./stick";

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

/** 판 시작 속도의 이 배율 범위 안에서만 공 속도가 움직이도록 제한한다.
 * (스틱과 부딪힐 때마다 스틱 자체의 속도가 더해지거나 빠지므로, 제한이 없으면
 * 반복 충돌로 한없이 빨라지거나 거의 멈출 수 있다.) */
const SPEED_CLAMP_RANGE = [0.5, 2] as const;

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

  // 스틱 모양(사각형 네 꼭짓점)은 시간이 지나도 바뀌지 않고 위치만 오가므로,
  // 매 스텝 다시 계산하지 않도록 변마다 한 번만 만들어 둔다.
  const quads: (StickQuad | null)[] = arena.edges.map((edge) =>
    edge.ownerIndex === null ? null : stickQuadShape(stickSpecs[edge.ownerIndex], edge.length)
  );
  const speedRange: [number, number] = [
    startCondition.ballSpeed * SPEED_CLAMP_RANGE[0],
    startCondition.ballSpeed * SPEED_CLAMP_RANGE[1],
  ];

  let t = 0;
  const maxSteps = Math.ceil(maxSimSeconds / SIM_DT);

  for (let step = 0; step < maxSteps; step++) {
    const result = advance(
      pos,
      vel,
      arena,
      stickSpecs,
      quads,
      speedRange,
      t,
      SIM_DT,
      startCondition.ballRadius
    );
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

/** 스틱과의 충돌을 한 스텝(dt) 안에서 몇 등분으로 나누어 검사할지.
 * 스틱도 움직이므로, 끝점만 보면 스틱이 그 사이에 밀고 들어온 경우를 놓쳐
 * 공 위치가 순간이동하듯 크게 보정되는 문제가 생긴다(연속 충돌 감지의 근사). */
const STICK_SUBSTEPS = 8;

function advance(
  pos: Vec2,
  vel: Vec2,
  arena: Arena,
  stickSpecs: StickSpec[],
  quads: (StickQuad | null)[],
  speedRange: [number, number],
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

  for (let i = 0; i < arena.edges.length; i++) {
    const edge = arena.edges[i];
    const localEnd = toLocal(newPos, edge);
    const margin = arena.vertexRadius;
    if (localEnd.along < margin || localEnd.along > edge.length - margin) continue;

    if (edge.ownerIndex === null) {
      // 소유자가 없는 중립 벽: 골 라인 자체가 항상 튕겨 내는 벽이다.
      if (localEnd.depth > ballRadius) continue;
      if (dot(vel, edge.outwardNormal) <= 0) continue;
      return {
        pos: fromLocal({ along: localEnd.along, depth: ballRadius }, edge),
        vel: reflect(vel, edge.outwardNormal),
        eliminatedOwnerIndex: null,
      };
    }

    const spec = stickSpecs[edge.ownerIndex];
    const quad = quads[i]!;
    const hit = findStickCollision(pos, vel, edge, spec, quad, t, dt, ballRadius);

    if (hit) {
      const newVel = resolveStickBounce(vel, hit, speedRange);
      // 서브스텝 tau 시점에 부딪혔으므로, 이번 스텝에 남은 시간(dt-tau) 만큼은
      // 새 속도로 마저 움직여야 한다. 그러지 않으면 공의 시계만 dt만큼 흐르고
      // 실제로는 tau만큼만 이동한 것이 되어, 다음 스텝에서 스틱 위치(시간 t+dt
      // 기준)와 공 위치 사이에 어긋남이 쌓여 같은 자리에서 계속 다시 붙잡혀
      // 튕기는 문제가 생긴다.
      const remaining = dt - hit.atTime;
      const finalPos = remaining > 0 ? add(hit.worldPos, scale(newVel, remaining)) : hit.worldPos;
      return { pos: finalPos, vel: newVel, eliminatedOwnerIndex: null };
    }

    // 스틱에 닿지 않았다: 방어 구간 밖에서 골 라인을 넘었으면 탈락이다.
    const coverage = stickCoverage(spec, edge.length, t + dt);
    const isCovered = isWithinCoverage(localEnd.along, coverage);
    if (!isCovered && localEnd.depth <= ballRadius && dot(vel, edge.outwardNormal) > 0) {
      return { pos: newPos, vel, eliminatedOwnerIndex: edge.ownerIndex };
    }
  }

  return { pos: newPos, vel, eliminatedOwnerIndex: null };
}

/** 스틱 속도가 공에 전달되는 비율. 1이면 이동벽을 정확히 물리대로 반사시키는데,
 * 옆면을 스치듯 낮은 각도로 부딪히는 경우 스틱과 공이 여러 스텝에 걸쳐 서로
 * 속도를 주고받으며 순식간에 최대 속도로 치솟는 경우가 있어(스틱 속도가
 * 공 속도와 비슷한 크기일 수 있으므로), 그 영향을 줄여 완화한다. */
const WALL_VELOCITY_TRANSFER = 0.3;

function resolveStickBounce(vel: Vec2, hit: StickHit, speedRange: [number, number]): Vec2 {
  const stickVel = scale(hit.stickVelWorld, WALL_VELOCITY_TRANSFER);
  // 이동벽 반사: 스틱 기준 상대속도를 면 법선으로 반사한 뒤, 스틱 자체의
  // 속도를 다시 더한다 — 스틱이 다가오는 방향이면 공이 더 빨라지고,
  // 물러나는 방향이면 더 느려진다.
  const relVel = sub(vel, stickVel);
  const reflectedRel = reflect(relVel, hit.worldNormal);
  return clampSpeed(add(reflectedRel, stickVel), speedRange);
}

function clampSpeed(vel: Vec2, speedRange: [number, number]): Vec2 {
  const speed = length(vel);
  if (speed === 0) return vel;
  const clamped = Math.min(Math.max(speed, speedRange[0]), speedRange[1]);
  return scale(vel, clamped / speed);
}

function isWithinCoverage(along: number, coverage: { from: number; to: number }): boolean {
  return along >= coverage.from && along <= coverage.to;
}

interface LocalPoint {
  /** 변을 따라가는 축. */
  along: number;
  /** 골 라인(변)에서 아레나 안쪽으로 들어가는 축(0 이상). */
  depth: number;
}

function toLocal(p: Vec2, edge: Edge): LocalPoint {
  const rel = sub(p, edge.a);
  return { along: dot(rel, edge.direction), depth: -dot(rel, edge.outwardNormal) };
}

function fromLocalDirection(v: LocalPoint, edge: Edge): Vec2 {
  return sub(scale(edge.direction, v.along), scale(edge.outwardNormal, v.depth));
}

function fromLocal(v: LocalPoint, edge: Edge): Vec2 {
  return add(edge.a, fromLocalDirection(v, edge));
}

interface StickHit {
  /** 스텝 시작 시각(t) 기준, 실제로 부딪힌 서브스텝의 경과 시간. */
  atTime: number;
  worldPos: Vec2;
  /** 부딪힌 면의 바깥쪽(스틱 밖 빈 공간 쪽) 법선. */
  worldNormal: Vec2;
  /** 부딪힌 순간 스틱 표면의 월드 속도(변을 따라가는 방향 성분만 있다). */
  stickVelWorld: Vec2;
}

/**
 * [t, t+dt] 구간을 STICK_SUBSTEPS 등분으로 나누어, 공이 스틱 사각형에 처음
 * 닿는 서브스텝을 찾는다(연속 충돌 감지의 근사). 스틱은 그 사이에도 계속
 * 움직이므로, 매 서브스텝마다 그 순간의 스틱 위치를 기준으로 판정한다.
 */
function findStickCollision(
  pos: Vec2,
  vel: Vec2,
  edge: Edge,
  spec: StickSpec,
  quad: StickQuad,
  t: number,
  dt: number,
  ballRadius: number
): StickHit | null {
  // dt가 매우 짧으므로, 스틱 속도는 이 스텝 동안 거의 일정하다고 보고
  // 양 끝 시각의 위치 차이로 근사한다.
  const stickVelAlong =
    (stickCenter(spec, edge.length, t + dt) - stickCenter(spec, edge.length, t)) / dt;
  const stickVelWorld = scale(edge.direction, stickVelAlong);

  for (let k = 1; k <= STICK_SUBSTEPS; k++) {
    const tau = (dt * k) / STICK_SUBSTEPS;
    const samplePos = add(pos, scale(vel, tau));
    const local = toLocal(samplePos, edge);
    const centerAlong = stickCenter(spec, edge.length, t + tau);
    const relLocal: LocalPoint = { along: local.along - centerAlong, depth: local.depth };

    const hit = circleVsQuad(relLocal, quad, ballRadius);
    if (!hit) continue;

    const worldNormal = fromLocalDirection(hit.normal, edge);
    const relVel = sub(vel, stickVelWorld);
    // 이미 스틱 표면에서 멀어지는 중이면(막 튕겨 나온 직후 등) 다시 반사시키지 않는다.
    if (dot(relVel, worldNormal) >= 0) continue;

    const worldPos = fromLocal(
      { along: hit.corrected.along + centerAlong, depth: hit.corrected.depth },
      edge
    );
    return { atTime: tau, worldPos, worldNormal, stickVelWorld };
  }
  return null;
}

interface QuadCollision {
  normal: LocalPoint;
  corrected: LocalPoint;
}

/**
 * 원(공)과 볼록 사각형(스틱)의 충돌을 판정하고, 겹쳤다면 밀어낼 위치와 법선을
 * 계산한다. quad는 v0(아랫면 왼쪽)→v1(아랫면 오른쪽)→v2(꼭짓점)→v3(윗면 왼쪽
 * 꺾임) 순서의 반시계 방향 사각형이다. v0-v1(아랫면=골 라인)은 탈출면에서
 * 제외한다 — 그러지 않으면 방어 구간 안에서 탈락 판정과 모순된다.
 */
function circleVsQuad(center: LocalPoint, quad: StickQuad, radius: number): QuadCollision | null {
  const verts = [quad.v0, quad.v1, quad.v2, quad.v3];
  const faces = verts.map((v, i) => {
    const next = verts[(i + 1) % verts.length];
    const edgeVec = subL(next, v);
    const edgeLength = lenL(edgeVec);
    const dir = scaleL(edgeVec, 1 / edgeLength);
    // 반시계 방향 사각형의 바깥쪽 법선 = 진행 방향을 시계 방향으로 90도 돌린 벡터.
    const normal: LocalPoint = { along: dir.depth, depth: -dir.along };
    return { a: v, dir, length: edgeLength, normal };
  });

  const inside = faces.every((f) => dotL(subL(center, f.a), f.normal) <= 0);

  if (inside) {
    // 원의 중심이 사각형 안에 있다(스틱이 움직이며 갑자기 덮은 경우 등):
    // 아랫면을 제외한 나머지 세 면 중 가장 가까운 곳으로 밀어낸다.
    let best: QuadCollision | null = null;
    let bestPenetration = Infinity;
    for (let i = 1; i < faces.length; i++) {
      const f = faces[i];
      const penetration = -dotL(subL(center, f.a), f.normal);
      if (penetration < bestPenetration) {
        bestPenetration = penetration;
        best = { normal: f.normal, corrected: addL(center, scaleL(f.normal, penetration + radius)) };
      }
    }
    return best;
  }

  // 사각형 밖: 아랫면을 제외한 세 면에 대해서만 최근접점을 구한다.
  let best: QuadCollision | null = null;
  let bestDist = Infinity;
  for (let i = 1; i < faces.length; i++) {
    const f = faces[i];
    const alongOnEdge = Math.min(Math.max(dotL(subL(center, f.a), f.dir), 0), f.length);
    const closest = addL(f.a, scaleL(f.dir, alongOnEdge));
    const delta = subL(center, closest);
    const dist = lenL(delta);
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      const normal = scaleL(delta, 1 / dist);
      best = { normal, corrected: addL(closest, scaleL(normal, radius)) };
    }
  }
  if (!best || bestDist >= radius) return null;
  return best;
}

function subL(a: LocalPoint, b: LocalPoint): LocalPoint {
  return { along: a.along - b.along, depth: a.depth - b.depth };
}
function addL(a: LocalPoint, b: LocalPoint): LocalPoint {
  return { along: a.along + b.along, depth: a.depth + b.depth };
}
function scaleL(a: LocalPoint, s: number): LocalPoint {
  return { along: a.along * s, depth: a.depth * s };
}
function dotL(a: LocalPoint, b: LocalPoint): number {
  return a.along * b.along + a.depth * b.depth;
}
function lenL(a: LocalPoint): number {
  return Math.hypot(a.along, a.depth);
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
