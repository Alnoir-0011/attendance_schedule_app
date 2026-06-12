import { describe, expect, it } from "vitest";

import {
  WEEKDAY_LABELS,
  isWeekday,
  mergeCompanyDays,
  type WeekdayRuleItem,
} from "@/lib/company-calendar";

// 2026-06-01 は月曜（水曜は 3・10・17・24日）
const RANGE = { start: "2026-06-01", end: "2026-06-15" };

const officeWednesday: WeekdayRuleItem = {
  weekday: 3,
  type: "OFFICE_DAY",
  label: "全社出社日",
};

describe("isWeekday", () => {
  it("0〜6 の整数のみ true になる", () => {
    expect(isWeekday(0)).toBe(true);
    expect(isWeekday(6)).toBe(true);
    expect(isWeekday(-1)).toBe(false);
    expect(isWeekday(7)).toBe(false);
    expect(isWeekday(1.5)).toBe(false);
  });
});

describe("WEEKDAY_LABELS", () => {
  it("日〜土の7個（インデックス = JS の getUTCDay）", () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(WEEKDAY_LABELS[0]).toBe("日");
    expect(WEEKDAY_LABELS[3]).toBe("水");
    expect(WEEKDAY_LABELS[6]).toBe("土");
  });
});

describe("mergeCompanyDays", () => {
  it("曜日ルールが範囲内の該当曜日すべてに展開される", () => {
    const merged = mergeCompanyDays({
      ...RANGE,
      companyDays: [],
      holidays: [],
      weekdayRules: [officeWednesday],
    });
    expect(merged).toEqual([
      { date: "2026-06-03", type: "OFFICE_DAY", label: "全社出社日" },
      { date: "2026-06-10", type: "OFFICE_DAY", label: "全社出社日" },
    ]);
  });

  it("祝日は休日として祝日名付きで含まれる", () => {
    const merged = mergeCompanyDays({
      ...RANGE,
      companyDays: [],
      holidays: [{ date: "2026-06-05", name: "テスト祝日" }],
      weekdayRules: [],
    });
    expect(merged).toEqual([
      { date: "2026-06-05", type: "HOLIDAY", label: "テスト祝日" },
    ]);
  });

  it("祝日は曜日ルールより優先される", () => {
    const merged = mergeCompanyDays({
      ...RANGE,
      companyDays: [],
      holidays: [{ date: "2026-06-03", name: "テスト祝日" }],
      weekdayRules: [officeWednesday],
    });
    expect(merged).toContainEqual({
      date: "2026-06-03",
      type: "HOLIDAY",
      label: "テスト祝日",
    });
  });

  it("個別指定は祝日・曜日ルールより優先される", () => {
    const merged = mergeCompanyDays({
      ...RANGE,
      companyDays: [
        { date: "2026-06-03", type: "OFFICE_DAY", label: "創立記念日イベント" },
      ],
      holidays: [{ date: "2026-06-03", name: "テスト祝日" }],
      weekdayRules: [officeWednesday],
    });
    expect(merged).toEqual([
      { date: "2026-06-03", type: "OFFICE_DAY", label: "創立記念日イベント" },
      { date: "2026-06-10", type: "OFFICE_DAY", label: "全社出社日" },
    ]);
  });

  it("ラベルなしの曜日ルールは label が null になる", () => {
    const merged = mergeCompanyDays({
      start: "2026-06-01",
      end: "2026-06-08",
      companyDays: [],
      holidays: [],
      weekdayRules: [{ weekday: 3, type: "HOLIDAY", label: null }],
    });
    expect(merged).toEqual([
      { date: "2026-06-03", type: "HOLIDAY", label: null },
    ]);
  });

  it("範囲外の個別指定・祝日は含まれず、結果は日付順になる", () => {
    const merged = mergeCompanyDays({
      ...RANGE,
      companyDays: [
        { date: "2026-06-20", type: "HOLIDAY", label: "範囲外" },
        { date: "2026-06-12", type: "HOLIDAY", label: "個別休日" },
      ],
      holidays: [{ date: "2026-05-06", name: "範囲外祝日" }],
      weekdayRules: [officeWednesday],
    });
    expect(merged).toEqual([
      { date: "2026-06-03", type: "OFFICE_DAY", label: "全社出社日" },
      { date: "2026-06-10", type: "OFFICE_DAY", label: "全社出社日" },
      { date: "2026-06-12", type: "HOLIDAY", label: "個別休日" },
    ]);
  });
});
