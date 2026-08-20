"use client";

import { Button } from "@/components/ui/button";
import { paletteForCount } from "@/lib/game/palette";
import type { Participant } from "@/lib/game/setup";

interface ResultsScreenProps {
  participants: Participant[];
  eliminatedOrder: string[];
  winnersCount: number;
  onReplay: () => void;
  onNewGame: () => void;
}

export function ResultsScreen({
  participants,
  eliminatedOrder,
  winnersCount,
  onReplay,
  onNewGame,
}: ResultsScreenProps) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const palette = paletteForCount(participants.length);
  const winners = eliminatedOrder.slice(0, winnersCount);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold">결과</h1>

      <section className="flex w-full max-w-sm flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">탈락 순서</h2>
        <ol className="flex flex-col gap-2">
          {eliminatedOrder.map((id, i) => {
            const p = byId.get(id)!;
            return (
              <li key={id} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{i + 1}</span>
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: palette[p.colorIndex] }}
                />
                <span>{p.name}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex w-full max-w-sm flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">최종 당첨자</h2>
        <ul className="flex flex-wrap gap-2">
          {winners.map((id) => {
            const p = byId.get(id)!;
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1"
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: palette[p.colorIndex] }}
                />
                {p.name}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex gap-3">
        <Button size="lg" onClick={onReplay}>
          다시 하기
        </Button>
        <Button size="lg" variant="outline" onClick={onNewGame}>
          새 게임
        </Button>
      </div>
    </div>
  );
}
