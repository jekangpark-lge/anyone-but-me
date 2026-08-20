"use client";

import { Button } from "@/components/ui/button";
import { paletteForCount } from "@/lib/game/palette";
import type { Participant } from "@/lib/game/setup";

interface ResultsScreenProps {
  participants: Participant[];
  eliminatedOrder: string[];
  onReplay: () => void;
  onNewGame: () => void;
}

export function ResultsScreen({
  participants,
  eliminatedOrder,
  onReplay,
  onNewGame,
}: ResultsScreenProps) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const palette = paletteForCount(participants.length);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold">결과</h1>

      <section className="flex w-72 flex-col gap-2">
        <h2 className="text-center text-sm font-medium text-muted-foreground">당첨자</h2>
        <ol className="flex flex-col gap-2">
          {eliminatedOrder.map((id, i) => {
            const p = byId.get(id)!;
            return (
              <li key={id} className="flex items-center gap-3">
                <span
                  className="flex size-6 items-center justify-center rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: palette[p.colorIndex] }}
                >
                  {i + 1}
                </span>
                <span>{p.name}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex w-72 gap-3">
        <Button size="lg" className="flex-1" onClick={onReplay}>
          다시 하기
        </Button>
        <Button size="lg" variant="outline" className="flex-1" onClick={onNewGame}>
          새 게임
        </Button>
      </div>
    </div>
  );
}
