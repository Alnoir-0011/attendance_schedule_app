import { expect, type Page } from "@playwright/test";

// シードユーザー（prisma/seed.ts）
export const ADMIN = { email: "admin@example.com", password: "password1234" };
export const MEMBER = {
  email: "member2@example.com",
  password: "password1234",
};

export type Credentials = { email: string; password: string };

// フォーム送信までを行う。ナビゲーション完了は待たないため、
// 失敗ケースや遷移確認自体がテスト対象の場合はこちらを使う
export async function login(page: Page, user: Credentials) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

// ログイン成功とトップページへの遷移完了まで待つ。
// ページ固有の h1 ではなく、レイアウトに属する安定要素（ヘッダーのブランドリンク）で待機する
export async function loginAndWait(page: Page, user: Credentials) {
  await login(page, user);
  await expect(
    page.getByRole("banner").getByRole("link", { name: "出社予定カレンダー" }),
  ).toBeVisible();
}
