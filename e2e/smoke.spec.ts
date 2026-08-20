import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 웰컴 문구와 시작하기 버튼이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Anyone, but Me");
  await expect(page.getByRole("heading", { name: "Anyone, but Me" })).toBeVisible();
  await expect(page.getByRole("button", { name: "시작하기" })).toBeVisible();
});
