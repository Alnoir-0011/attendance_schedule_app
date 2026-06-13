import { expect, test, type Page } from "@playwright/test";

import { ADMIN, MEMBER, login, loginAndWait } from "./helpers/auth";
import { jstDateString } from "./helpers/dates";

// ユーザー追加→編集→パスワード再設定を同一ユーザーで連続して検証するため直列実行。
// 作成したユーザーは残置を許容する（シードが全削除→再投入の冪等動作のため次回 seed で消える。
// メールはタイムスタンプ入りで実行間の衝突を回避する）
test.describe.configure({ mode: "serial" });

const RUN_ID = Date.now();
const CREATED = {
  email: `e2e-admin-${RUN_ID}@example.com`,
  password: "initpass1234",
};
const EDITED_EMAIL = `e2e-admin-edited-${RUN_ID}@example.com`;
const NEW_PASSWORD = "newpass5678";

// カレンダー E2E（20・25・26日）・profile E2E（27日）・シード（2・9・16・24日）と重ならない日
const HOLIDAY_DAY = 21;
const HOLIDAY_LABEL = "E2E休日";

// 曜日ルールの検証対象日。7日 はどの月でも日本の祝日にならず（5日 は こどもの日、
// 6日 は GW の振替休日になり得る）、シード・他スペックとも重ならない
const RULE_TARGET_DAY = 7;
const RULE_LABEL = "E2E曜日ルール";
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

async function gotoAdminTab(
  page: Page,
  tabName: "ユーザー管理" | "会社カレンダー",
) {
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("link", { name: "管理" })
    .click();
  await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
  await page.getByRole("tab", { name: tabName }).click();
}

// テストの成否に関わらず、追加した休日・曜日ルールが残っていれば削除して復元する
// （正常終了時は各テスト本体内で削除済み。ここは途中失敗時のフォールバック）
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await loginAndWait(page, ADMIN);
  await gotoAdminTab(page, "会社カレンダー");

  for (const label of [HOLIDAY_LABEL, RULE_LABEL]) {
    const row = page.getByRole("row").filter({ hasText: label });
    if ((await row.count()) > 0) {
      await row.getByRole("button", { name: "削除" }).click();
      await expect(row).toHaveCount(0);
    }
  }
  await page.close();
});

test("admin がユーザーを追加すると一覧に表示され、そのユーザーでログインできる", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);
  await gotoAdminTab(page, "ユーザー管理");

  await page.getByRole("button", { name: "ユーザーを追加" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("氏名").fill("E2E 試験");
  await dialog.getByLabel("メールアドレス").fill(CREATED.email);
  await dialog.getByLabel("初期パスワード").fill(CREATED.password);
  await dialog.getByLabel("ロール").selectOption("MEMBER");
  await dialog.getByLabel("上限交通費（円 / 月。0 = 未設定）").fill("5000");
  await dialog.getByRole("button", { name: "追加する" }).click();
  await expect(dialog).toHaveCount(0);

  // 一覧に表示される
  const row = page.getByRole("row").filter({ hasText: CREATED.email });
  await expect(row).toBeVisible();
  await expect(row.getByText("E2E 試験")).toBeVisible();
  await expect(row.getByText("5,000 円")).toBeVisible();

  // 追加したユーザーでログインできる
  await page.context().clearCookies();
  await loginAndWait(page, CREATED);
});

test("admin が氏名・メール・鍵所持・上限交通費を編集すると一覧に反映される", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);
  await gotoAdminTab(page, "ユーザー管理");

  const row = page.getByRole("row").filter({ hasText: CREATED.email });
  await row.getByRole("button", { name: "編集" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("氏名").fill("E2E 編集済");
  await dialog.getByLabel("メールアドレス").fill(EDITED_EMAIL);
  await dialog.getByLabel("鍵所持").check();
  await dialog.getByLabel("上限交通費（円 / 月。0 = 未設定）").fill("8000");
  await dialog.getByRole("button", { name: "保存する" }).click();
  await expect(dialog).toHaveCount(0);

  const editedRow = page.getByRole("row").filter({ hasText: EDITED_EMAIL });
  await expect(editedRow.getByText("E2E 編集済")).toBeVisible();
  await expect(editedRow.getByText("🔑 あり")).toBeVisible();
  await expect(editedRow.getByText("8,000 円")).toBeVisible();
});

test("admin がパスワードを再設定すると対象ユーザーは新パスワードでのみログインできる", async ({
  page,
}) => {
  await loginAndWait(page, ADMIN);
  await gotoAdminTab(page, "ユーザー管理");

  const row = page.getByRole("row").filter({ hasText: EDITED_EMAIL });
  await row.getByRole("button", { name: "パスワード再設定" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("新しいパスワード").fill(NEW_PASSWORD);
  await dialog.getByRole("button", { name: "再設定する" }).click();
  await expect(dialog).toHaveCount(0);

  // 旧パスワードではログインできない
  await page.context().clearCookies();
  await login(page, { email: EDITED_EMAIL, password: CREATED.password });
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();

  // 新パスワードでログインできる
  await loginAndWait(page, { email: EDITED_EMAIL, password: NEW_PASSWORD });
});

test("admin が休日を指定するとカレンダーに反映される", async ({ page }) => {
  await loginAndWait(page, ADMIN);
  await gotoAdminTab(page, "会社カレンダー");

  // 「種別」「ラベル（任意）」は曜日ルールフォームにもあるため、個別指定フォームに絞る
  const dayForm = page.getByRole("form", { name: "個別の日付指定" });
  await dayForm.getByLabel("日付").fill(jstDateString(HOLIDAY_DAY));
  await dayForm.getByLabel("種別").selectOption("HOLIDAY");
  await dayForm.getByLabel("ラベル（任意）").fill(HOLIDAY_LABEL);
  await dayForm.getByRole("button", { name: "追加する" }).click();

  // 管理画面の一覧に表示される
  const holidayRow = page.getByRole("row").filter({ hasText: HOLIDAY_LABEL });
  await expect(holidayRow).toBeVisible();
  await expect(holidayRow.getByText("休日", { exact: true })).toBeVisible();

  // カレンダーに反映される
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("link", { name: "カレンダー" })
    .click();
  const cell = page.locator(`[data-date="${jstDateString(HOLIDAY_DAY)}"]`);
  await expect(cell.getByText(HOLIDAY_LABEL)).toBeVisible();

  // 復元（削除がカレンダーからも消えることの確認を兼ねる）
  await gotoAdminTab(page, "会社カレンダー");
  await holidayRow.getByRole("button", { name: "削除" }).click();
  await expect(holidayRow).toHaveCount(0);
});

test("admin が曜日ルールを設定するとカレンダーの該当曜日に反映される", async ({
  page,
}) => {
  // 当月7日の曜日をルール対象にする（7日 はどの月でも祝日にならないため決定的）
  const targetDate = jstDateString(RULE_TARGET_DAY);
  const targetWeekday = new Date(`${targetDate}T00:00:00Z`).getUTCDay();

  await loginAndWait(page, ADMIN);
  await gotoAdminTab(page, "会社カレンダー");

  const ruleForm = page.getByRole("form", { name: "曜日ルール設定" });
  await ruleForm.getByLabel("曜日").selectOption(String(targetWeekday));
  await ruleForm.getByLabel("種別").selectOption("OFFICE_DAY");
  await ruleForm.getByLabel("ラベル（任意）").fill(RULE_LABEL);
  await ruleForm.getByRole("button", { name: "設定する" }).click();

  // ルール一覧に表示される
  const ruleRow = page.getByRole("row").filter({ hasText: RULE_LABEL });
  await expect(ruleRow).toBeVisible();
  await expect(
    ruleRow.getByText(`毎週${WEEKDAY_LABELS[targetWeekday]}曜`),
  ).toBeVisible();

  // カレンダーの該当曜日（当月7日）に反映される
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("link", { name: "カレンダー" })
    .click();
  await expect(
    page.locator(`[data-date="${targetDate}"]`).getByText(RULE_LABEL),
  ).toBeVisible();

  // 復元（削除でカレンダーからも消える）
  await gotoAdminTab(page, "会社カレンダー");
  await ruleRow.getByRole("button", { name: "削除" }).click();
  await expect(ruleRow).toHaveCount(0);
});

test("祝日がカレンダーに休日として表示され、出社登録時に警告が出る", async ({
  page,
}) => {
  await loginAndWait(page, MEMBER);

  // 当月に祝日があるとは限らないため、必ず元日のある翌年1月まで月送りする
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentMonth = now.getUTCMonth() + 1;
  const nextJanuaryYear = now.getUTCFullYear() + 1;
  const clicks = 13 - currentMonth;
  for (let i = 0; i < clicks; i++) {
    await page.locator(".fc-next-button").click();
  }
  await expect(page.locator(".fc-toolbar-title")).toHaveText(
    `${nextJanuaryYear}年1月`,
  );

  // 元日が祝日（休日）として表示される
  const cell = page.locator(`[data-date="${nextJanuaryYear}-01-01"]`);
  await expect(cell.getByText("元日")).toBeVisible();

  // 出社登録ダイアログに休日警告が表示される（登録はしない）
  await cell.click();
  await expect(
    page.getByText("この日は休日です（元日）。出社登録は可能です。"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("member は管理画面にアクセスできずトップへリダイレクトされる", async ({
  page,
}) => {
  await loginAndWait(page, MEMBER);

  // ナビに管理リンクが表示されない
  await expect(
    page
      .getByRole("navigation", { name: "メインナビゲーション" })
      .getByRole("link", { name: "管理" }),
  ).toHaveCount(0);

  // URL 直叩きでもサーバー側ガードでトップへ戻される
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "管理画面" })).toHaveCount(0);
});
