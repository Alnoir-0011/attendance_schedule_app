import { describe, expect, it } from "vitest";

import { jstYearMonth, parseDateString, toDateString } from "@/lib/date";

describe("parseDateString", () => {
  it("YYYY-MM-DD を UTC 0時の Date に変換する", () => {
    expect(parseDateString("2026-06-21")).toEqual(
      new Date("2026-06-21T00:00:00Z"),
    );
  });

  it("形式が不正な場合は null を返す", () => {
    expect(parseDateString("2026/06/21")).toBeNull();
    expect(parseDateString("2026-6-21")).toBeNull();
    expect(parseDateString("")).toBeNull();
  });

  it("存在しない日付（繰り上がり）は null を返す", () => {
    expect(parseDateString("2026-02-30")).toBeNull();
    expect(parseDateString("2026-13-01")).toBeNull();
  });
});

describe("toDateString", () => {
  it("Date を YYYY-MM-DD に変換する", () => {
    expect(toDateString(new Date("2026-06-21T00:00:00Z"))).toBe("2026-06-21");
  });
});

describe("jstYearMonth", () => {
  it("JST の年月を返す（UTC 15時以降は日本では翌日）", () => {
    // UTC 2026-06-30 16:00 = JST 2026-07-01 01:00
    expect(jstYearMonth(new Date("2026-06-30T16:00:00Z"))).toEqual({
      year: 2026,
      month: 7,
    });
  });

  it("JST と UTC が同日の時刻はそのままの年月を返す", () => {
    expect(jstYearMonth(new Date("2026-06-15T00:00:00Z"))).toEqual({
      year: 2026,
      month: 6,
    });
  });
});
