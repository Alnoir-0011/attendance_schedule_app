import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { SEED_PASSWORD, seed, seedUsers } from "../../prisma/seed";

let counts: Awaited<ReturnType<typeof seed>>;

beforeAll(async () => {
  counts = await seed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("シード投入", () => {
  it("ユーザーが想定人数（admin 1名 + member 3名）投入される", async () => {
    expect(counts.users).toBe(seedUsers.length);
    expect(await prisma.user.count({ where: { role: "ADMIN" } })).toBe(1);
    expect(await prisma.user.count({ where: { role: "MEMBER" } })).toBe(3);
  });

  it("当月の出社予定・会社カレンダーが投入される", async () => {
    expect(counts.attendanceDays).toBeGreaterThan(0);
    expect(await prisma.attendanceDay.count()).toBe(counts.attendanceDays);

    expect(counts.companyDays).toBeGreaterThan(0);
    expect(await prisma.companyDay.count()).toBe(counts.companyDays);
    expect(await prisma.companyDay.count({ where: { type: "HOLIDAY" } })).toBe(
      1,
    );
  });

  it("シードユーザーのメール + パスワードでログインできる", async () => {
    for (const user of seedUsers) {
      const result = await auth.api.signInEmail({
        body: { email: user.email, password: SEED_PASSWORD },
      });
      expect(result.user.email).toBe(user.email);
    }
  });

  it("再実行しても重複せず同じ件数になる（冪等性）", async () => {
    const again = await seed();
    expect(again).toEqual(counts);
  });
});
