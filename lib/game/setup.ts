import { MAX_PARTICIPANTS, paletteForCount } from "./palette";

export const MIN_PARTICIPANTS = 2;
export const DEFAULT_PARTICIPANT_COUNT = 2;
export const DEFAULT_WINNERS_COUNT = 1;

export interface Participant {
  id: string;
  name: string;
  /** 이 참가자가 지금 쓰고 있는 색상의, 인원수 팔레트 안에서의 인덱스. */
  colorIndex: number;
}

export function defaultParticipants(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: String(i + 1),
    colorIndex: i,
  }));
}

/** 참가자 수가 바뀔 때, 겹치는 순서의 참가자는 그대로 두고 늘어나거나 줄어든 만큼만 조정한다. */
export function resizeParticipants(participants: Participant[], newCount: number): Participant[] {
  const kept = renormalizeColorIndexes(
    newCount <= participants.length ? participants.slice(0, newCount) : participants
  );
  if (newCount <= participants.length) {
    return kept;
  }
  const added = Array.from({ length: newCount - participants.length }, (_, i) => {
    const index = participants.length + i;
    return { id: `p${index}`, name: String(index + 1), colorIndex: index };
  });
  return [...kept, ...added];
}

/**
 * 색상 원 교환으로 colorIndex가 뒤섞인 뒤 인원수가 줄어들면, 남은 참가자의
 * colorIndex가 줄어든 팔레트 범위를 벗어날 수 있다. 상대 순서는 유지한 채
 * 0..count-1 범위로 다시 채워 넣는다.
 */
function renormalizeColorIndexes(participants: Participant[]): Participant[] {
  const rank = new Map(
    [...new Set(participants.map((p) => p.colorIndex))].sort((a, b) => a - b).map((ci, i) => [ci, i])
  );
  return participants.map((p) => ({ ...p, colorIndex: rank.get(p.colorIndex)! }));
}

export function winnersCountOptions(participantCount: number): number[] {
  return Array.from({ length: Math.max(participantCount - 1, 0) }, (_, i) => i + 1);
}

export function clampWinnersCount(winnersCount: number, participantCount: number): number {
  const max = Math.max(participantCount - 1, 1);
  return Math.min(Math.max(winnersCount, 1), max);
}

export function participantColors(participants: Participant[]): string[] {
  const palette = paletteForCount(participants.length);
  return participants.map((p) => palette[p.colorIndex]);
}

/**
 * participantIndex 참가자의 색상 원을 눌렀을 때: 다음 색상으로 바뀌고,
 * 그 색을 이미 갖고 있던 다른 참가자와 서로 맞바뀐다.
 */
export function cycleParticipantColor(
  participants: Participant[],
  participantIndex: number
): Participant[] {
  const count = participants.length;
  const current = participants[participantIndex];
  const nextColorIndex = (current.colorIndex + 1) % count;
  const swapWithIndex = participants.findIndex((p) => p.colorIndex === nextColorIndex);

  return participants.map((p, i) => {
    if (i === participantIndex) return { ...p, colorIndex: nextColorIndex };
    if (i === swapWithIndex) return { ...p, colorIndex: current.colorIndex };
    return p;
  });
}

export { MAX_PARTICIPANTS };
