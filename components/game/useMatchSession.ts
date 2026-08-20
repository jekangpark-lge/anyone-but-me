"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildArena } from "@/lib/game/polygon";
import { planRound } from "@/lib/game/roundPlanner";
import type { RoundPlan } from "@/lib/game/simulate";
import type { Participant } from "@/lib/game/setup";
import { randomStickSpec, type StickSpec } from "@/lib/game/stick";

const ELIMINATION_DISPLAY_MS = 900;

export type RoundPhase =
  | { kind: "loading" }
  | { kind: "playing"; plan: RoundPlan; startedAt: number }
  | { kind: "elimination"; plan: RoundPlan; eliminatedId: string };

export interface MatchState {
  participants: Participant[];
  winnersCount: number;
  remaining: string[];
  eliminatedOrder: string[];
  round: RoundPhase;
  finished: boolean;
}

export function useMatchSession() {
  const [state, setState] = useState<MatchState | null>(null);
  const sticksRef = useRef<Record<string, StickSpec>>({});

  const start = useCallback((participants: Participant[], winnersCount: number) => {
    const sticks: Record<string, StickSpec> = {};
    for (const p of participants) {
      sticks[p.id] = randomStickSpec(Math.random);
    }
    sticksRef.current = sticks;

    setState({
      participants,
      winnersCount,
      remaining: participants.map((p) => p.id),
      eliminatedOrder: [],
      round: { kind: "loading" },
      finished: false,
    });
  }, []);

  const reset = useCallback(() => setState(null), []);

  const completeRound = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.round.kind !== "playing") return prev;
      const eliminatedId = prev.remaining[prev.round.plan.eliminatedOwnerIndex];
      return { ...prev, round: { kind: "elimination", plan: prev.round.plan, eliminatedId } };
    });
  }, []);

  // "loading" 상태가 되면 새 판의 시작조건을 미리 계산한다.
  useEffect(() => {
    if (!state || state.finished || state.round.kind !== "loading") return;
    let cancelled = false;

    const arena = buildArena(state.remaining.length);
    const stickSpecs = state.remaining.map((id) => sticksRef.current[id]);

    planRound(arena, stickSpecs).then((plan) => {
      if (cancelled) return;
      setState((prev) =>
        prev && prev.round.kind === "loading"
          ? { ...prev, round: { kind: "playing", plan, startedAt: performance.now() } }
          : prev
      );
    });

    return () => {
      cancelled = true;
    };
  }, [state]);

  // 탈락 표시가 끝나면 다음 판(또는 게임 종료)으로 넘어간다.
  useEffect(() => {
    if (!state || state.finished || state.round.kind !== "elimination") return;
    const eliminatedId = state.round.eliminatedId;

    const timer = setTimeout(() => {
      setState((prev) => {
        if (!prev || prev.finished) return prev;
        const remaining = prev.remaining.filter((id) => id !== eliminatedId);
        const eliminatedOrder = [...prev.eliminatedOrder, eliminatedId];
        const finished = eliminatedOrder.length >= prev.winnersCount;
        return {
          ...prev,
          remaining,
          eliminatedOrder,
          finished,
          round: finished ? prev.round : { kind: "loading" },
        };
      });
    }, ELIMINATION_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [state]);

  return { state, start, reset, completeRound };
}
