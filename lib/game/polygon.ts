import { type Vec2, normalize, sub, length, add, scale } from "./vector";

export interface Edge {
  a: Vec2;
  b: Vec2;
  length: number;
  /** 원점(아레나 중심)에서 바깥쪽을 향하는 단위 법선. */
  outwardNormal: Vec2;
  /** 변을 따라가는 단위 방향 벡터(a -> b). */
  direction: Vec2;
  /** 이 변을 방어하는 참가자의 인덱스. null이면 누구의 골 라인도 아닌 벽(항상 튕겨 낸다). */
  ownerIndex: number | null;
}

export interface Arena {
  vertices: Vec2[];
  edges: Edge[];
  /** 골대(꼭짓점) 판정 반지름. */
  vertexRadius: number;
}

/**
 * 참가자 수만큼의 변을 가진 정다각형 아레나를 만든다.
 * 참가자가 2명일 때는 정다각형이 선분으로 퇴화하므로, 좌우 골 라인과
 * 위아래의 중립 벽(누구의 골 라인도 아닌, 항상 튕겨 내는 변)으로 이루어진
 * 직사각형 형태로 대신한다.
 */
export function buildArena(participantCount: number, radius = 1): Arena {
  if (participantCount === 2) {
    return buildTwoParticipantArena(radius);
  }

  const vertices: Vec2[] = [];
  for (let i = 0; i < participantCount; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / participantCount;
    vertices.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }

  return finalizeArena(
    vertices,
    vertices.map((_, i) => i),
    radius
  );
}

function buildTwoParticipantArena(radius: number): Arena {
  const half = radius * 0.45;
  const topRight: Vec2 = { x: half, y: -radius };
  const bottomRight: Vec2 = { x: half, y: radius };
  const bottomLeft: Vec2 = { x: -half, y: radius };
  const topLeft: Vec2 = { x: -half, y: -radius };

  return finalizeArena(
    [topRight, bottomRight, bottomLeft, topLeft],
    [0, null, 1, null],
    radius
  );
}

function finalizeArena(
  vertices: Vec2[],
  owners: (number | null)[],
  radius: number
): Arena {
  const n = vertices.length;
  const edges: Edge[] = vertices.map((a, i) => {
    const b = vertices[(i + 1) % n];
    const mid = scale(add(a, b), 0.5);
    return {
      a,
      b,
      length: length(sub(b, a)),
      outwardNormal: normalize(mid),
      direction: normalize(sub(b, a)),
      ownerIndex: owners[i],
    };
  });

  const minEdgeLength = Math.min(...edges.map((e) => e.length));
  return {
    vertices,
    edges,
    vertexRadius: Math.min(radius * 0.12, minEdgeLength * 0.18),
  };
}
