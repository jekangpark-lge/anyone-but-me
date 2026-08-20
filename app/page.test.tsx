import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("처음 열면 웰컴 문구와 시작하기 버튼만 있는 화면이 보인다", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { name: "Anyone, but Me" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "시작하기" })).toBeInTheDocument();
});

test("시작하기를 누르면 설정 화면으로 넘어간다", () => {
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "시작하기" }));

  expect(screen.getByRole("heading", { name: "게임 준비" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "게임 시작" })).toBeInTheDocument();
});
