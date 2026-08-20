import { type Vec2, add, length, scale, sub } from "./vector";

/**
 * 꼭짓점을 순서대로 이은 다각형을, 각 모서리를 살짝 둥글린 SVG path로 만든다.
 */
export function roundedPolygonPath(points: Vec2[], cornerRadius: number): string {
  const n = points.length;
  const parts: string[] = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    const toPrev = sub(prev, curr);
    const toNext = sub(next, curr);
    const r = Math.min(cornerRadius, length(toPrev) / 2, length(toNext) / 2);

    const p1 = add(curr, scale(toPrev, r / length(toPrev)));
    const p2 = add(curr, scale(toNext, r / length(toNext)));

    parts.push(i === 0 ? `M ${p1.x} ${p1.y}` : `L ${p1.x} ${p1.y}`);
    parts.push(`Q ${curr.x} ${curr.y} ${p2.x} ${p2.y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

export interface StickShapeSpec {
  topAngleDeg: number;
  bottomLengthRatio: number;
  sideLengthRatio: number;
}

/**
 * 스틱의 네 꼭짓점을, 변 로컬 좌표(along: 변을 따라가는 축, depth: 변에서
 * 아레나 안쪽으로 들어가는 축)로 계산한다. 아랫면은 골 라인(depth=0)에 놓이고,
 * 윗면은 안쪽으로 sideLength만큼 들어간 자리에서 topAngle만큼 옆으로 기울어진다.
 */
export function stickLocalCorners(
  spec: StickShapeSpec,
  edgeLength: number,
  centerAlong: number
): { along: number; depth: number }[] {
  const bottomHalf = (spec.bottomLengthRatio * edgeLength) / 2;
  const sideLength = spec.sideLengthRatio * edgeLength;
  const topOffset = sideLength * Math.tan((spec.topAngleDeg * Math.PI) / 180);

  return [
    { along: centerAlong - bottomHalf, depth: 0 },
    { along: centerAlong + bottomHalf, depth: 0 },
    { along: centerAlong + bottomHalf + topOffset, depth: sideLength },
    { along: centerAlong - bottomHalf + topOffset, depth: sideLength },
  ];
}
