"use client";

import { Button } from "@/components/ui/button";
import { paletteForCount } from "@/lib/game/palette";
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  clampWinnersCount,
  cycleParticipantColor,
  resizeParticipants,
  winnersCountOptions,
  type Participant,
} from "@/lib/game/setup";

interface SetupScreenProps {
  participants: Participant[];
  winnersCount: number;
  onChangeParticipants: (participants: Participant[]) => void;
  onChangeWinnersCount: (count: number) => void;
  onSubmit: () => void;
}

export function SetupScreen({
  participants,
  winnersCount,
  onChangeParticipants,
  onChangeWinnersCount,
  onSubmit,
}: SetupScreenProps) {
  const palette = paletteForCount(participants.length);

  const handleCountChange = (count: number) => {
    onChangeParticipants(resizeParticipants(participants, count));
    onChangeWinnersCount(clampWinnersCount(winnersCount, count));
  };

  const handleNameChange = (index: number, name: string) => {
    onChangeParticipants(participants.map((p, i) => (i === index ? { ...p, name } : p)));
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold">게임 준비</h1>

      <div className="flex w-72 items-center justify-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          참가자
          <select
            className="w-20 rounded-md border border-input bg-background px-2 py-1"
            value={participants.length}
            onChange={(e) => handleCountChange(Number(e.target.value))}
          >
            {Array.from(
              { length: MAX_PARTICIPANTS - MIN_PARTICIPANTS + 1 },
              (_, i) => MIN_PARTICIPANTS + i
            ).map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
        </label>

        <div className="h-6 w-px shrink-0 bg-border" />

        <label className="flex items-center gap-2">
          당첨자
          <select
            className="w-20 rounded-md border border-input bg-background px-2 py-1"
            value={winnersCount}
            onChange={(e) => onChangeWinnersCount(Number(e.target.value))}
          >
            {winnersCountOptions(participants.length).map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="flex w-72 flex-col gap-3">
        {participants.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`${i + 1}번 참가자 색상 바꾸기`}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: palette[p.colorIndex] }}
              onClick={() => onChangeParticipants(cycleParticipantColor(participants, i))}
            >
              {i + 1}
            </button>
            <input
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={p.name}
              onChange={(e) => handleNameChange(i, e.target.value)}
              aria-label={`${i + 1}번 참가자 이름`}
            />
          </li>
        ))}
      </ul>

      <Button size="lg" className="w-72" onClick={onSubmit}>
        게임 시작
      </Button>
    </div>
  );
}
