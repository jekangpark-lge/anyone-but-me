import { describe, expect, test } from "vitest";
import { buildArena } from "./polygon";
import { length, sub } from "./vector";

describe("buildArena", () => {
  test("참가자 수만큼의 변을 만들고, 각 변은 그 순서의 참가자가 방어한다", () => {
    const arena = buildArena(6);

    expect(arena.edges).toHaveLength(6);
    arena.edges.forEach((edge, i) => {
      expect(edge.ownerIndex).toBe(i);
    });
  });

  test("변들이 닫힌 도형을 이룬다(한 변의 끝이 다음 변의 시작과 만난다)", () => {
    const arena = buildArena(5);

    arena.edges.forEach((edge, i) => {
      const next = arena.edges[(i + 1) % arena.edges.length];
      expect(length(sub(edge.b, next.a))).toBeCloseTo(0, 10);
    });
  });

  test("모든 변의 길이가 같다(정다각형)", () => {
    const arena = buildArena(7);
    const lengths = arena.edges.map((e) => e.length);

    lengths.forEach((l) => expect(l).toBeCloseTo(lengths[0], 10));
  });

  test("2명일 때는 좌우 골 라인 2개와 위아래 중립 벽 2개로 이루어진 닫힌 도형이다", () => {
    const arena = buildArena(2);

    expect(arena.edges).toHaveLength(4);
    const owners = arena.edges.map((e) => e.ownerIndex).sort();
    expect(owners).toEqual([0, 1, null, null].sort());

    arena.edges.forEach((edge, i) => {
      const next = arena.edges[(i + 1) % arena.edges.length];
      expect(length(sub(edge.b, next.a))).toBeCloseTo(0, 10);
    });
  });

  test("바깥쪽 법선은 아레나 중심에서 멀어지는 방향이다", () => {
    const arena = buildArena(4);

    arena.edges.forEach((edge) => {
      const mid = { x: (edge.a.x + edge.b.x) / 2, y: (edge.a.y + edge.b.y) / 2 };
      const towardMid = mid.x * edge.outwardNormal.x + mid.y * edge.outwardNormal.y;
      expect(towardMid).toBeGreaterThan(0);
    });
  });
});
