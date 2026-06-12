import { expect, test, type Page } from "@playwright/test";

// シードユーザー（prisma/seed.ts）
const ADMIN = { email: "admin@example.com", password: "password1234" };
const MEMBER = { email: "member2@example.com", password: "password1234" };

// フォーム送信までを行う。ナビゲーション完了は待たないため、
// 呼び出し元で遷移後の要素表示（toBeVisible 等）を確認してから次の操作を行うこと
async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

test("未認証でトップへアクセスするとログインページへリダイレクトされる", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("シードユーザーでログインするとトップページが表示される", async ({
  page,
}) => {
  await login(page, ADMIN);
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
  await login(page, MEMBER);
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/admin/);
});

test("admin は /admin にアクセスできる", async ({ page }) => {
  await login(page, ADMIN);
  // ログイン完了（Cookie 設定とトップへの遷移）を待ってから /admin へ移動する
  await expect(
    page.getByRole("heading", { name: "出社予定カレンダー" }),
  ).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
});

test("ログアウトするとログインページに戻り、保護ページに入れない", async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
