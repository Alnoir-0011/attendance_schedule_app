import { expect, test } from "@playwright/test";

import { ADMIN, MEMBER, login, loginAndWait } from "./helpers/auth";

test("未認証でトップへアクセスするとログインページへリダイレクトされる", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("無効なセッション Cookie が残っていてもリダイレクトループにならずログインページが表示される", async ({
  page,
  context,
  baseURL,
}) => {
  // サーバー側のセッションが無効化された後（シード再投入・セッション失効など）に
  // ブラウザへ Cookie だけが残った状態を再現する
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "stale-invalid-token",
      url: baseURL ?? "http://localhost:3000",
    },
  ]);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("ログイン済みで /login にアクセスするとトップへ戻される", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
});

test("シードユーザーでログインするとトップページが表示される", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("管理 太郎")).toBeVisible();
});

test("誤ったパスワードではログインできずエラーが表示される", async ({
  page,
}) => {
  await login(page, { email: ADMIN.email, password: "wrong-password" });
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("存在しないメールアドレスでも同じエラーメッセージが表示される", async ({
  page,
}) => {
  await login(page, {
    email: "no-such-user@example.com",
    password: "password1234",
  });
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("member は /admin にアクセスできずトップへ戻される", async ({ page }) => {
  await loginAndWait(page, MEMBER);
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/admin/);
});

test("admin は /admin にアクセスできる", async ({ page }) => {
  await loginAndWait(page, ADMIN);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
});

test("ログアウトするとログインページに戻り、保護ページに入れない", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
