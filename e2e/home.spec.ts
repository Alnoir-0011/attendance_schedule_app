import { expect, test } from "@playwright/test";

test("トップページが表示される", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
});
