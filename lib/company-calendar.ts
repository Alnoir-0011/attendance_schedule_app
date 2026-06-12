// 会社カレンダーの有効日計算（個別指定 ＞ 祝日 ＞ 曜日ルール のマージ）の純粋ロジック

import { type CompanyDayItem } from "@/lib/attendance";
import { parseDateString, toDateString } from "@/lib/date";
import { type HolidayItem } from "@/lib/holidays";

export type WeekdayRuleItem = {
  weekday: number; // 0=日〜6=土（JS の getUTCDay 準拠）
  type: "OFFICE_DAY" | "HOLIDAY";
  label: string | null;
};

// インデックス = weekday（0=日〜6=土）
export const WEEKDAY_LABELS = [
  "日",
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
] as const;

export function isWeekday(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// [start, end) の各日について、優先順位 個別指定 ＞ 祝日 ＞ 曜日ルール で
// 有効な会社カレンダー項目を組み立てる（日付順）
export function mergeCompanyDays(params: {
  start: string; // YYYY-MM-DD（含む）
  end: string; // YYYY-MM-DD（含まない）
  companyDays: CompanyDayItem[];
  holidays: HolidayItem[];
  weekdayRules: WeekdayRuleItem[];
}): CompanyDayItem[] {
  const start = parseDateString(params.start);
  const end = parseDateString(params.end);
  if (!start || !end) return [];

  const byDate = new Map<string, CompanyDayItem>();

  // 優先度の低い順に上書きしていく: 曜日ルール → 祝日 → 個別指定
  const ruleByWeekday = new Map(
    params.weekdayRules.map((rule) => [rule.weekday, rule]),
  );
  for (let time = start.getTime(); time < end.getTime(); time += DAY_MS) {
    const date = new Date(time);
    const rule = ruleByWeekday.get(date.getUTCDay());
    if (rule) {
      byDate.set(toDateString(date), {
        date: toDateString(date),
        type: rule.type,
        label: rule.label,
      });
    }
  }

  for (const holiday of params.holidays) {
    if (holiday.date >= params.start && holiday.date < params.end) {
      byDate.set(holiday.date, {
        date: holiday.date,
        type: "HOLIDAY",
        label: holiday.name,
      });
    }
  }

  for (const day of params.companyDays) {
    if (day.date >= params.start && day.date < params.end) {
      byDate.set(day.date, day);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
