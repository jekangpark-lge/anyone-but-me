import { type Vec2, add, length, scale, sub } from "./vector";
import { type StickSpec, stickQuadShape } from "./stick";

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

/**
 * 스틱의 네 꼭짓점을, 변 로컬 좌표(along: 변을 따라가는 축, depth: 변에서
 * 아레나 안쪽으로 들어가는 축)로 계산한다. 실제 모양(a,b,c,d로 정해지는 사각형)
 * 계산은 stick.ts의 stickQuadShape가 갖고 있으며, 여기서는 그 결과를 스틱
 * 중심 위치(centerAlong)만큼 이동시켜 반환한다.
 */
export function stickLocalCorners(
  spec: StickSpec,
  edgeLength: number,
  centerAlong: number
): { along: number; depth: number }[] {
  const quad = stickQuadShape(spec, edgeLength);
  return [quad.v0, quad.v1, quad.v2, quad.v3].map((p) => ({
    along: p.along + centerAlong,
    depth: p.depth,
  }));
}
