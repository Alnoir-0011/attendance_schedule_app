import { expect, test, type Page } from "@playwright/test";

import { MEMBER, loginAndWait } from "./helpers/auth";
import { jstDateString } from "./helpers/dates";

// どちらのテストも MEMBER（在宅 次郎）のプロフィール設定を書き換えるため、
// このファイル内は直列実行にして相互干渉を防ぐ。
// シード状態への復元はテスト途中失敗でも必ず走るよう afterAll で行う
test.describe.configure({ mode: "serial" });

// シード値（prisma/seed.ts の member2）: 日額 600 円・月次上限 10,000 円・出社登録は 9日 のみ
const SEED_DAILY_COST = "600";
const EXTRA_ATTENDANCE_DAY = 27; // カレンダー E2E（20・25・26日）と重ならない日

async function gotoProfile(page: Page) {
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("link", { name: "プロフィール" })
    .click();
  await expect(
    page.getByRole("heading", { name: "プロフィール" }),
  ).toBeVisible();
}

async function gotoCalendar(page: Page) {
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("link", { name: "カレンダー" })
    .click();
}

async function saveDailyCost(page: Page, value: string) {
  await page.getByLabel("1日あたり交通費（円）").fill(value);
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
}

// テストの成否に関わらずシード状態へ復元する
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await loginAndWait(page, MEMBER);

  // 追加登録した出社日が残っていれば取消す
  const cell = page.locator(
    `[data-date="${jstDateString(EXTRA_ATTENDANCE_DAY)}"]`,
  );
  await cell.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const cancelButton = page.getByRole("button", { name: "出社を取り消す" });
  if ((await cancelButton.count()) > 0) {
    await cancelButton.click();
    await expect(cell.getByText("在宅 次郎")).toHaveCount(0);
  } else {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  // 設定をシード値（日額600円・通知OFF）に戻す
  await gotoProfile(page);
  await page.getByLabel("1日あたり交通費（円）").fill(SEED_DAILY_COST);
  await page.getByLabel("メール通知").uncheck();
  await page.getByLabel("Slack 通知").uncheck();
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await page.close();
});

test("交通費を設定し出社日を登録すると上限接近アラートが表示される", async ({
  page,
}) => {
  await loginAndWait(page, MEMBER);
  await gotoProfile(page);

  // Next.js のルートアナウンサーが常に role=alert を持つため、アラートの有無はテキストで判定する
  const limitAlert = page.getByText("想定交通費が月次上限の80%を超えています");
  // サマリの値はカード内の定義リストに絞って確認する
  const summary = page.locator("dl");

  // シード状態: 1日 × 600円 = 600円（上限 10,000 円の 80% = 8,000 円以下）→ アラートなし
  await expect(summary.getByText("1 日")).toBeVisible();
  await expect(limitAlert).toHaveCount(0);

  // 日額 4,500 円に変更（1日 × 4,500 = 4,500円 ≦ 8,000円）→ まだアラートなし
  await saveDailyCost(page, "4500");
  await expect(summary.getByText("4,500 円")).toBeVisible();
  await expect(limitAlert).toHaveCount(0);

  // カレンダーで出社日を1日追加（2日 × 4,500 = 9,000円 > 8,000円）→ アラート表示
  await gotoCalendar(page);
  const cell = page.locator(
    `[data-date="${jstDateString(EXTRA_ATTENDANCE_DAY)}"]`,
  );
  await cell.click();
  await page.getByRole("button", { name: "出社する" }).click();
  await expect(cell.getByText("在宅 次郎")).toBeVisible();

  await gotoProfile(page);
  await expect(summary.getByText("2 日")).toBeVisible();
  await expect(summary.getByText("9,000 円")).toBeVisible();
  await expect(limitAlert).toBeVisible();
});

test("通知トグルの値が保存され再表示される", async ({ page }) => {
  await loginAndWait(page, MEMBER);
  await gotoProfile(page);

  // シード状態は両方 OFF
  await expect(page.getByLabel("メール通知")).not.toBeChecked();
  await expect(page.getByLabel("Slack 通知")).not.toBeChecked();

  // 両方 ON にして保存 → リロード後も保持されている
  await page.getByLabel("メール通知").check();
  await page.getByLabel("Slack 通知").check();
  await page.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("メール通知")).toBeChecked();
  await expect(page.getByLabel("Slack 通知")).toBeChecked();
});
