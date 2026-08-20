import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { defaultParticipants } from "@/lib/game/setup";
import { useMatchSession } from "./useMatchSession";

describe("useMatchSession", () => {
  test("게임이 끝난 뒤에는 탈락 순서가 더 이상 늘어나지 않는다", async () => {
    const { result } = renderHook(() => useMatchSession());

    act(() => {
      result.current.start(defaultParticipants(2), 1);
    });

    await waitFor(() => expect(result.current.state?.round.kind).toBe("playing"));

    act(() => {
      result.current.completeRound();
    });

    await waitFor(() => expect(result.current.state?.finished).toBe(true));
    expect(result.current.state?.eliminatedOrder).toHaveLength(1);

    // 게임 종료 뒤 탈락 표시 타이머가 배경에서 계속 반복 실행되며 같은
    // 참가자를 eliminatedOrder에 계속 추가하는 회귀가 없는지 확인한다.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(result.current.state?.eliminatedOrder).toHaveLength(1);
  });
});
