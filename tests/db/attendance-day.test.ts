import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma";

const TEST_USER_ID = "test-unique-constraint-user";
const TEST_EMAIL = "unique-constraint-test@example.com";
const targetDate = new Date(Date.UTC(2026, 0, 15));

beforeAll(async () => {
  // 前回失敗時の残骸を掃除してからテスト用ユーザーを作成
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      name: "制約テスト",
      email: TEST_EMAIL,
    },
  });
});

beforeEach(async () => {
  // 各テストを独立させるため、テスト用ユーザーの出社予定をクリアする
  await prisma.attendanceDay.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  // onDelete: Cascade により attendance_day も削除される
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("AttendanceDay の (userId, date) ユニーク制約", () => {
  it("同一ユーザー・同一日の重複登録はユニーク制約違反（P2002）になる", async () => {
    await prisma.attendanceDay.create({
      data: { userId: TEST_USER_ID, date: targetDate, comment: "1回目" },
    });

    await expect(
      prisma.attendanceDay.create({
        data: { userId: TEST_USER_ID, date: targetDate, comment: "2回目" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("同一ユーザーでも別の日付なら登録できる", async () => {
    const otherDate = new Date(Date.UTC(2026, 0, 16));
    const created = await prisma.attendanceDay.create({
      data: { userId: TEST_USER_ID, date: otherDate },
    });

    expect(created.userId).toBe(TEST_USER_ID);
  });

  it("upsert なら同一日の再登録は内容更新になり重複しない", async () => {
    const where = {
      userId_date: { userId: TEST_USER_ID, date: targetDate },
    };
    await prisma.attendanceDay.upsert({
      where,
      create: {
        userId: TEST_USER_ID,
        date: targetDate,
        comment: "1回目",
        startTime: "09:00",
        endTime: "17:30",
      },
      update: { comment: "1回目", startTime: "09:00", endTime: "17:30" },
    });
    // 2回目は退社時刻を外す（部分的な内容変更が正しく上書きされること）
    await prisma.attendanceDay.upsert({
      where,
      create: {
        userId: TEST_USER_ID,
        date: targetDate,
        comment: "2回目",
        startTime: "10:00",
        endTime: null,
      },
      update: { comment: "2回目", startTime: "10:00", endTime: null },
    });

    const rows = await prisma.attendanceDay.findMany({
      where: { userId: TEST_USER_ID, date: targetDate },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].comment).toBe("2回目");
    expect(rows[0].startTime).toBe("10:00");
    expect(rows[0].endTime).toBeNull();
  });
});
