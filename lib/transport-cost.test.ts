import { describe, expect, it } from "vitest";

import {
  calcMonthlyCost,
  jstMonthRange,
  shouldShowLimitAlert,
} from "@/lib/transport-cost";

describe("calcMonthlyCost", () => {
  it("出社登録日数 × 日額で算出する", () => {
    expect(calcMonthlyCost(10, 800)).toBe(8000);
  });

  it("出社日数 0 または日額 0 なら 0 円になる", () => {
    expect(calcMonthlyCost(0, 800)).toBe(0);
    expect(calcMonthlyCost(10, 0)).toBe(0);
  });
});

describe("shouldShowLimitAlert", () => {
  // 上限 10000 円 → 閾値は 8000 円（80%）
  const limit = 10000;

  it("80% ちょうどでは表示しない", () => {
    expect(shouldShowLimitAlert(8000, limit)).toBe(false);
  });

  it("80% 超で表示する", () => {
    expect(shouldShowLimitAlert(8001, limit)).toBe(true);
  });

  it("100% 超でも表示する", () => {
    expect(shouldShowLimitAlert(12000, limit)).toBe(true);
  });

  it("80% 未満では表示しない", () => {
    expect(shouldShowLimitAlert(7999, limit)).toBe(false);
  });

  it("上限が未設定（0）のユーザーは対象外", () => {
    expect(shouldShowLimitAlert(999999, 0)).toBe(false);
  });
});

describe("jstMonthRange", () => {
  it("JST 基準で月を判定する（UTC では前日でも JST で翌月なら翌月になる）", () => {
    // UTC 2026-05-31 16:00 = JST 2026-06-01 01:00 → 6月
    const { start, end } = jstMonthRange(new Date("2026-05-31T16:00:00Z"));
    expect(start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("JST でまだ月末なら当月のまま", () => {
    // UTC 2026-05-31 14:59 = JST 2026-05-31 23:59 → 5月
    const { start, end } = jstMonthRange(new Date("2026-05-31T14:59:59Z"));
    expect(start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("年をまたぐ月境界も正しく扱う", () => {
    // UTC 2026-12-31 15:00 = JST 2027-01-01 00:00 → 2027年1月
    const { start, end } = jstMonthRange(new Date("2026-12-31T15:00:00Z"));
    expect(start.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });
});
