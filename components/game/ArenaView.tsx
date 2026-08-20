"use client";

import { useEffect, useRef, useState } from "react";
import { paletteForCount } from "@/lib/game/palette";
import type { Participant } from "@/lib/game/setup";
import { sampleTrajectory } from "@/lib/game/simulate";
import { stickCenter } from "@/lib/game/stick";
import { roundedPolygonPath, stickLocalCorners } from "@/lib/game/stickShape";
import { add, scale, type Vec2 } from "@/lib/game/vector";
import type { RoundPhase } from "./useMatchSession";

const NEUTRAL_STROKE = "var(--muted-foreground)";
const LABEL_OFFSET = 0.16;

interface ArenaViewProps {
  participants: Participant[];
  remaining: string[];
  round: RoundPhase;
  onRoundComplete: () => void;
}

export function ArenaView({ participants, remaining, round, onRoundComplete }: ArenaViewProps) {
  const [now, setNow] = useState(() => performance.now());
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    if (round.kind !== "playing") return;

    const loop = () => {
      setNow(performance.now());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [round]);

  useEffect(() => {
    if (round.kind !== "playing" || completedRef.current) return;
    const elapsed = (now - round.startedAt) / 1000;
    if (elapsed >= round.plan.durationSeconds) {
      completedRef.current = true;
      onRoundComplete();
    }
  }, [now, round, onRoundComplete]);

  if (round.kind === "loading") {
    return <LoadingArena />;
  }

  const { plan } = round;
  const elapsed =
    round.kind === "playing"
      ? Math.min((now - round.startedAt) / 1000, plan.durationSeconds)
      : plan.durationSeconds;

  const ballPos = sampleTrajectory(plan.trajectory, elapsed);
  const palette = paletteForCount(participants.length);
  const byId = new Map(participants.map((p) => [p.id, p]));
  const colorFor = (id: string) => palette[byId.get(id)!.colorIndex];
  const eliminatedId = round.kind === "elimination" ? round.eliminatedId : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
      <svg viewBox="-1.5 -1.5 3 3" className="w-full max-w-md aspect-square" role="img" aria-label="게임 아레나">
        {plan.arena.edges.map((edge, i) => {
          const ownerId = edge.ownerIndex !== null ? remaining[edge.ownerIndex] : null;
          const color = ownerId ? colorFor(ownerId) : NEUTRAL_STROKE;
          return (
            <line
              key={`edge-${i}`}
              x1={edge.a.x}
              y1={edge.a.y}
              x2={edge.b.x}
              y2={edge.b.y}
              stroke={color}
              strokeWidth={0.025}
              strokeLinecap="round"
            />
          );
        })}

        {plan.arena.edges.map((edge, i) => {
          if (edge.ownerIndex === null) return null;
          const ownerId = remaining[edge.ownerIndex];
          const spec = plan.stickSpecs[edge.ownerIndex];
          const centerAlong = stickCenter(spec, edge.length, elapsed);
          const corners = stickLocalCorners(spec, edge.length, centerAlong).map((c) =>
            add(edge.a, add(scale(edge.direction, c.along), scale(negate(edge.outwardNormal), c.depth)))
          );
          return (
            <path
              key={`stick-${i}`}
              d={roundedPolygonPath(corners, plan.arena.vertexRadius * 0.4)}
              fill={colorFor(ownerId)}
            />
          );
        })}

        {plan.arena.vertices.map((v, i) => (
          <circle key={`vertex-${i}`} cx={v.x} cy={v.y} r={plan.arena.vertexRadius} fill="var(--foreground)" />
        ))}

        <circle cx={ballPos.x} cy={ballPos.y} r={plan.startCondition.ballRadius} fill="var(--foreground)" />

        {plan.arena.edges.map((edge, i) => {
          if (edge.ownerIndex === null) return null;
          const ownerId = remaining[edge.ownerIndex];
          const mid = scale(add(edge.a, edge.b), 0.5);
          const labelPos = add(mid, scale(edge.outwardNormal, LABEL_OFFSET));
          const isEliminated = ownerId === eliminatedId;
          return (
            <text
              key={`label-${i}`}
              x={labelPos.x}
              y={labelPos.y}
              fontSize={0.11}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colorFor(ownerId)}
              style={isEliminated ? { textDecoration: "line-through" } : undefined}
            >
              {byId.get(ownerId)!.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function negate(v: Vec2): Vec2 {
  return { x: -v.x, y: -v.y };
}

function LoadingArena() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8">
      <div
        role="status"
        aria-label="다음 판 준비 중"
        className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
      />
      <p className="text-sm text-muted-foreground">판을 준비하고 있어요…</p>
    </div>
  );
}
