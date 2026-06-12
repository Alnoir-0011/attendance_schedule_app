import { describe, expect, it } from "vitest";

import { listHolidaysInRange } from "@/lib/holidays";

describe("listHolidaysInRange", () => {
  it("範囲内の祝日を日付順に返す（2026年1月）", () => {
    const holidays = listHolidaysInRange("2026-01-01", "2026-02-01");
    expect(holidays).toEqual([
      { date: "2026-01-01", name: "元日" },
      { date: "2026-01-12", name: "成人の日" },
    ]);
  });

  it("祝日のない月は空配列を返す（2026年6月）", () => {
    expect(listHolidaysInRange("2026-06-01", "2026-07-01")).toEqual([]);
  });

  it("振替休日を含む（2026-05-03 憲法記念日が日曜 → 05-06 振替休日）", () => {
    const holidays = listHolidaysInRange("2026-05-01", "2026-06-01");
    expect(holidays).toContainEqual({ date: "2026-05-06", name: "振替休日" });
    expect(holidays).toContainEqual({ date: "2026-05-03", name: "憲法記念日" });
  });

  it("年をまたぐ範囲を扱える", () => {
    const holidays = listHolidaysInRange("2026-12-15", "2027-01-05");
    expect(holidays).toEqual([{ date: "2027-01-01", name: "元日" }]);
  });

  it("start は含み end は含まない", () => {
    // 2026-01-12 は成人の日
    expect(listHolidaysInRange("2026-01-12", "2026-01-13")).toEqual([
      { date: "2026-01-12", name: "成人の日" },
    ]);
    expect(listHolidaysInRange("2026-01-02", "2026-01-12")).toEqual([]);
  });
});
