// 日本の祝日の算出（japanese-holidays のラッパー。外部通信なし・DB 保存なし）

// CoffeeScript 生成の UMD モジュールのため named import の CJS interop が
// バンドラによって失敗する。namespace import で取り込む
import * as JapaneseHolidays from "japanese-holidays";

export type HolidayItem = {
  date: string; // YYYY-MM-DD
  name: string; // 祝日名（例: 元日・振替休日）
};

// [start, end) の範囲内の祝日（振替休日含む）を日付順に返す。
// 引数は "YYYY-MM-DD"（ISO 形式のため辞書順比較で範囲判定できる）
export function listHolidaysInRange(
  startStr: string,
  endStr: string,
): HolidayItem[] {
  const startYear = Number(startStr.slice(0, 4));
  const endYear = Number(endStr.slice(0, 4));

  const holidays: HolidayItem[] = [];
  for (let year = startYear; year <= endYear; year++) {
    for (const holiday of JapaneseHolidays.getHolidaysOf(year, true)) {
      const date = `${year}-${String(holiday.month).padStart(2, "0")}-${String(
        holiday.date,
      ).padStart(2, "0")}`;
      if (date >= startStr && date < endStr) {
        holidays.push({ date, name: holiday.name });
      }
    }
  }
  // ライブラリの返す順序に依存せず、末尾のソートで日付順を保証する
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
