import { expect, test, type Page } from "@playwright/test";

import { MEMBER, loginAndWait } from "./helpers/auth";
import { jstDateString, jstMonthTitle } from "./helpers/dates";

// MEMBER（在宅 次郎）はシードで 9日 のみ出社登録済み。
// データを変更するテストはシードが使っていない日（25日・26日・20日）を日付ごとに分けて使い、
// 並列実行でも互いに干渉しないようにする。変更したデータは各テスト内で取り消して復元する。

function dayCell(page: Page, dateStr: string) {
  return page.locator(`[data-date="${dateStr}"]`);
}

test("出社日を時刻付きで登録するとカレンダーに表示され、取消で消える", async ({
  page,
}) => {
  await loginAndWait(page, MEMBER);
  const date = jstDateString(25);
  const cell = dayCell(page, date);

  await cell.click();
  await page.getByLabel("出社時刻（任意）").selectOption("09:00");
  await page.getByLabel("退社時刻（任意）").selectOption("17:30");
  await page.getByLabel(/一言コメント/).fill("テスト出社");
  await page.getByRole("button", { name: "出社する" }).click();
  await expect(
    cell.getByText("9:00〜17:30 在宅 次郎: テスト出社"),
  ).toBeVisible();

  await cell.click();
  await page.getByRole("button", { name: "出社を取り消す" }).click();
  await expect(cell.getByText(/在宅 次郎: テスト出社/)).toHaveCount(0);
});

test("別ユーザーの出社予定とコメント・時間帯がカレンダーに表示される", async ({
  page,
}) => {
  await loginAndWait(page, MEMBER);
  const cell = dayCell(page, jstDateString(2));

  // シード: 出社 花子（member1）が 2日 に 11:30〜（出社時刻のみ）で登録済み
  await expect(
    cell.getByText("11:30〜 出社 花子: ランチ行きましょう"),
  ).toBeVisible();
  // シード: 管理 太郎（admin）は 9:00〜17:30 で登録済み
  await expect(
    cell.getByText("9:00〜17:30 管理 太郎: 定例MTGのため出社"),
  ).toBeVisible();
});

test("鍵所持者が出社する日にバッジが表示される", async ({ page }) => {
  await loginAndWait(page, MEMBER);

  // シード: 2日 は鍵所持者（管理 太郎・出社 花子）が出社
  await expect(
    dayCell(page, jstDateString(2)).getByText("🔑 鍵あり"),
  ).toBeVisible();

  // 鍵を持たない自分（在宅 次郎）だけが出社する日にはバッジが出ない
  const date = jstDateString(26);
  const cell = dayCell(page, date);
  await cell.click();
  await page.getByRole("button", { name: "出社する" }).click();
  await expect(cell.getByText("在宅 次郎")).toBeVisible();
  await expect(cell.getByText("🔑 鍵あり")).toHaveCount(0);

  // 後始末（シード状態に戻す）
  await cell.click();
  await page.getByRole("button", { name: "出社を取り消す" }).click();
  await expect(cell.getByText("在宅 次郎")).toHaveCount(0);
});

test("休日は背景表示され、登録時に警告が出るがそのまま登録できる", async ({
  page,
}) => {
  await loginAndWait(page, MEMBER);
  const date = jstDateString(20);
  const cell = dayCell(page, date);

  // シード: 20日 は休日（創立記念日）としてラベル表示される
  await expect(cell.getByText("創立記念日")).toBeVisible();

  await cell.click();
  await expect(
    page.getByText("この日は休日です（創立記念日）。出社登録は可能です。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "出社する" }).click();
  await expect(cell.getByText("在宅 次郎")).toBeVisible();

  // 後始末（シード状態に戻す）
  await cell.click();
  await page.getByRole("button", { name: "出社を取り消す" }).click();
  await expect(cell.getByText("在宅 次郎")).toHaveCount(0);
});

test("月を移動すると表示対象の月が切り替わる", async ({ page }) => {
  await loginAndWait(page, MEMBER);
  const title = page.locator(".fc-toolbar-title");
  await expect(title).toHaveText(jstMonthTitle(0));

  await page.locator(".fc-next-button").click();
  await expect(title).toHaveText(jstMonthTitle(1));

  await page.locator(".fc-prev-button").click();
  await expect(title).toHaveText(jstMonthTitle(0));
});
