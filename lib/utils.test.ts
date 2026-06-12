import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("複数のクラス名を結合する", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("falsy な値を無視する", () => {
    expect(cn("px-2", false, undefined, "py-1")).toBe("px-2 py-1");
  });

  it("競合する Tailwind クラスは後勝ちでマージされる", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
