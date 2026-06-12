import { describe, expect, it } from "vitest";

import {
  COMMENT_MAX_LENGTH,
  formatDateJa,
  formatTimeRange,
  keyHolderDates,
  timeOptions,
  toCalendarEvents,
  validateComment,
  validateTimeRange,
  type AttendanceItem,
  type CompanyDayItem,
} from "@/lib/attendance";

function attendance(overrides: Partial<AttendanceItem> = {}): AttendanceItem {
  return {
    id: "att-1",
    userId: "user-1",
    date: "2026-06-02",
    comment: null,
    startTime: null,
    endTime: null,
    userName: "出社 花子",
    hasKey: false,
    ...overrides,
  };
}

describe("validateComment", () => {
  it("100文字ちょうどは許可される", () => {
    expect(validateComment("あ".repeat(COMMENT_MAX_LENGTH))).toBeNull();
  });

  it("101文字はエラーになる", () => {
    expect(validateComment("あ".repeat(COMMENT_MAX_LENGTH + 1))).toBe(
      "コメントは100文字以内で入力してください",
    );
  });

  it("空文字は許可される（コメント任意）", () => {
    expect(validateComment("")).toBeNull();
  });
});

describe("validateTimeRange", () => {
  it("両方未指定・片方のみ・正しい組み合わせは許可される", () => {
    expect(validateTimeRange(null, null)).toBeNull();
    expect(validateTimeRange("09:00", null)).toBeNull();
    expect(validateTimeRange(null, "17:30")).toBeNull();
    expect(validateTimeRange("09:00", "17:30")).toBeNull();
  });

  it("HH:mm 形式・30分刻み以外はエラーになる", () => {
    expect(validateTimeRange("9:00", null)).toBe(
      "時刻は30分刻み（HH:mm）で指定してください",
    );
    expect(validateTimeRange("09:15", null)).toBe(
      "時刻は30分刻み（HH:mm）で指定してください",
    );
    expect(validateTimeRange(null, "24:00")).toBe(
      "時刻は30分刻み（HH:mm）で指定してください",
    );
  });

  it("退社時刻が出社時刻以前の場合はエラーになる", () => {
    expect(validateTimeRange("17:00", "09:00")).toBe(
      "退社時刻は出社時刻より後にしてください",
    );
    expect(validateTimeRange("09:00", "09:00")).toBe(
      "退社時刻は出社時刻より後にしてください",
    );
  });
});

describe("formatTimeRange", () => {
  it("両方指定・片方のみ・未指定を整形する", () => {
    expect(formatTimeRange("09:00", "17:00")).toBe("9:00〜17:00");
    expect(formatTimeRange("10:00", null)).toBe("10:00〜");
    expect(formatTimeRange(null, "17:30")).toBe("〜17:30");
    expect(formatTimeRange(null, null)).toBe("");
  });
});

describe("timeOptions", () => {
  it("00:00〜23:30 の30分刻みで48個になる", () => {
    const options = timeOptions();
    expect(options).toHaveLength(48);
    expect(options[0]).toBe("00:00");
    expect(options[47]).toBe("23:30");
  });
});

describe("keyHolderDates", () => {
  it("鍵所持者が出社する日のみを重複なしで返す", () => {
    const dates = keyHolderDates([
      attendance({ id: "a1", date: "2026-06-02", hasKey: true }),
      attendance({ id: "a2", date: "2026-06-02", hasKey: true }),
      attendance({ id: "a3", date: "2026-06-09", hasKey: false }),
      attendance({ id: "a4", date: "2026-06-16", hasKey: true }),
    ]);
    expect(dates).toEqual(["2026-06-02", "2026-06-16"]);
  });

  it("鍵所持者がいなければ空になる", () => {
    expect(keyHolderDates([attendance({ hasKey: false })])).toEqual([]);
  });
});

describe("formatDateJa", () => {
  it("YYYY-MM-DD を日本語表記に変換する", () => {
    expect(formatDateJa("2026-06-02")).toBe("2026年6月2日");
    expect(formatDateJa("2026-12-31")).toBe("2026年12月31日");
  });
});

describe("toCalendarEvents", () => {
  it("コメント付きの出社予定はタイトルに名前とコメントを含む", () => {
    const events = toCalendarEvents(
      [attendance({ comment: "ランチ行きましょう" })],
      [],
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "att-1",
      title: "出社 花子: ランチ行きましょう",
      date: "2026-06-02",
    });
  });

  it("コメントなしの出社予定はタイトルが名前のみになる", () => {
    const events = toCalendarEvents([attendance()], []);
    expect(events[0].title).toBe("出社 花子");
  });

  it("時間帯付きの出社予定はタイトルの先頭に時間帯が付く", () => {
    const events = toCalendarEvents(
      [
        attendance({
          startTime: "09:00",
          endTime: "17:30",
          comment: "ランチ行きましょう",
        }),
      ],
      [],
    );
    expect(events[0].title).toBe("9:00〜17:30 出社 花子: ランチ行きましょう");
  });

  it("鍵所持者が出社する日にバッジイベントが追加される", () => {
    const events = toCalendarEvents(
      [
        attendance({ id: "a1", date: "2026-06-02", hasKey: true }),
        attendance({ id: "a2", date: "2026-06-09", hasKey: false }),
      ],
      [],
    );
    const badges = events.filter((e) => e.title === "🔑 鍵あり");
    expect(badges).toHaveLength(1);
    expect(badges[0].date).toBe("2026-06-02");
  });

  it("会社カレンダーは背景イベントとラベルイベントになる", () => {
    const companyDays: CompanyDayItem[] = [
      { date: "2026-06-20", type: "HOLIDAY", label: "創立記念日" },
      { date: "2026-06-02", type: "OFFICE_DAY", label: null },
    ];
    const events = toCalendarEvents([], companyDays);

    const holidayBg = events.find((e) => e.id === "company-bg-2026-06-20");
    expect(holidayBg).toMatchObject({ display: "background" });

    const holidayLabel = events.find(
      (e) => e.id === "company-label-2026-06-20",
    );
    expect(holidayLabel?.title).toBe("創立記念日");

    // ラベルなしの場合は種別のデフォルト名になる
    const officeLabel = events.find((e) => e.id === "company-label-2026-06-02");
    expect(officeLabel?.title).toBe("出社日");
  });
});
