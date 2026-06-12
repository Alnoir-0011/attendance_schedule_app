import { describe, expect, it } from "vitest";

import { isAdmin } from "@/lib/authz";

describe("isAdmin", () => {
  it("ADMIN ロールは true", () => {
    expect(isAdmin({ role: "ADMIN" })).toBe(true);
  });

  it("MEMBER ロールは false", () => {
    expect(isAdmin({ role: "MEMBER" })).toBe(false);
  });

  it("不明なロールは false", () => {
    expect(isAdmin({ role: "" })).toBe(false);
    expect(isAdmin({ role: "admin" })).toBe(false);
  });
});
