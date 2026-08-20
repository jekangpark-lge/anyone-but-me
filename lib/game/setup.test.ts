import { describe, expect, test } from "vitest";
import {
  clampWinnersCount,
  cycleParticipantColor,
  defaultParticipants,
  resizeParticipants,
  winnersCountOptions,
} from "./setup";

describe("defaultParticipants", () => {
  test("이름 기본값은 1부터 시작하는 숫자, 색상 기본값은 순서대로다", () => {
    const participants = defaultParticipants(3);
    expect(participants.map((p) => p.name)).toEqual(["1", "2", "3"]);
    expect(participants.map((p) => p.colorIndex)).toEqual([0, 1, 2]);
  });
});

describe("resizeParticipants", () => {
  test("인원수를 늘리면 기존 참가자는 그대로 두고 새 참가자만 뒤에 추가한다", () => {
    const base = defaultParticipants(2);
    base[0].name = "커스텀";

    const resized = resizeParticipants(base, 4);

    expect(resized).toHaveLength(4);
    expect(resized[0].name).toBe("커스텀");
    expect(resized[2].name).toBe("3");
    expect(resized[3].name).toBe("4");
  });

  test("인원수를 줄이면 뒤에서부터 잘라낸다", () => {
    const base = defaultParticipants(4);
    const resized = resizeParticipants(base, 2);
    expect(resized.map((p) => p.name)).toEqual(["1", "2"]);
  });

  test("색상을 맞바꾼 뒤 인원수를 줄여도 colorIndex가 줄어든 팔레트 범위를 벗어나지 않는다", () => {
    const swapped = defaultParticipants(4).map((p, i) => ({
      ...p,
      colorIndex: [2, 0, 3, 1][i],
    }));

    const resized = resizeParticipants(swapped, 2);

    resized.forEach((p) => {
      expect(p.colorIndex).toBeGreaterThanOrEqual(0);
      expect(p.colorIndex).toBeLessThan(2);
    });
    expect(new Set(resized.map((p) => p.colorIndex)).size).toBe(2);
  });
});

describe("winnersCountOptions / clampWinnersCount", () => {
  test("당첨자 수 선택지는 항상 1명부터 (참가자 수-1)명까지다", () => {
    expect(winnersCountOptions(5)).toEqual([1, 2, 3, 4]);
    expect(winnersCountOptions(2)).toEqual([1]);
  });

  test("당첨자 수가 참가자 수 이상이면 참가자 수-1로 줄인다", () => {
    expect(clampWinnersCount(5, 3)).toBe(2);
    expect(clampWinnersCount(1, 3)).toBe(1);
  });
});

describe("cycleParticipantColor", () => {
  test("색상 원을 누르면 다음 색상으로 바뀌고, 그 색을 갖고 있던 참가자와 서로 맞바뀐다", () => {
    const participants = defaultParticipants(3); // colorIndex: 0,1,2

    const result = cycleParticipantColor(participants, 0);

    expect(result[0].colorIndex).toBe(1); // 0 -> 1로 이동
    expect(result[1].colorIndex).toBe(0); // 원래 1을 갖고 있던 참가자가 0을 받음
    expect(result[2].colorIndex).toBe(2); // 관련 없는 참가자는 그대로

    const colorIndexes = result.map((p) => p.colorIndex).sort();
    expect(colorIndexes).toEqual([0, 1, 2]); // 중복 없이 1:1 유지
  });
});
