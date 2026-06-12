import { expect, test, type Page } from "@playwright/test";

import { ADMIN, MEMBER, loginAndWait } from "./helpers/auth";

function nav(page: Page) {
  return page.getByRole("navigation", { name: "メインナビゲーション" });
}

test("admin のナビには「管理」リンクが表示される", async ({ page }) => {
  await loginAndWait(page, ADMIN);
  await expect(
    nav(page).getByRole("link", { name: "管理", exact: true }),
  ).toBeVisible();
});

test("member のナビには「管理」リンクが表示されない", async ({ page }) => {
  await loginAndWait(page, MEMBER);
  await expect(
    nav(page).getByRole("link", { name: "カレンダー" }),
  ).toBeVisible();
  await expect(
    nav(page).getByRole("link", { name: "プロフィール" }),
  ).toBeVisible();
  await expect(
    nav(page).getByRole("link", { name: "管理", exact: true }),
  ).toHaveCount(0);
});

test("ナビから各ページへ遷移できる（member）", async ({ page }) => {
  await loginAndWait(page, MEMBER);

  await nav(page).getByRole("link", { name: "プロフィール" }).click();
  await expect(
    page.getByRole("heading", { name: "プロフィール" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);

  await nav(page).getByRole("link", { name: "カレンダー" }).click();
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("admin はナビから管理画面へ遷移できる", async ({ page }) => {
  await loginAndWait(page, ADMIN);

  await nav(page).getByRole("link", { name: "管理", exact: true }).click();
  await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin$/);
});

test("ヘッダーにユーザー名が表示され、ログアウトでログイン画面に戻る", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);
  await expect(page.getByText("管理 太郎 さん")).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
