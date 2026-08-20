/**
 * 참가자 실용적 상한(8명 안팎)만큼 서로 구분되도록 고른 색상 팔레트.
 * 인원수만으로 항상 같은 색상 집합이 재현되도록, 앞에서부터 순서대로 잘라 쓴다.
 */
export const PARTICIPANT_PALETTE = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
] as const;

export const MAX_PARTICIPANTS = PARTICIPANT_PALETTE.length;

export function paletteForCount(count: number): string[] {
  return PARTICIPANT_PALETTE.slice(0, count);
}
