// JST 基準で当月の日付・表示文字列を組み立てるヘルパー（シードデータが当月基準のため）

function jstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

// 当月の指定日を "YYYY-MM-DD" で返す
export function jstDateString(day: number): string {
  const now = jstNow();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

// 当月から offset ヶ月ずらした月のタイトル（FullCalendar の ja ロケール表記 "YYYY年M月"）
export function jstMonthTitle(offset = 0): string {
  const now = jstNow();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
  );
  return `${base.getUTCFullYear()}年${base.getUTCMonth() + 1}月`;
}
