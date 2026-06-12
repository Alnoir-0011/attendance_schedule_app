import { fileURLToPath } from "node:url";

import { auth } from "../lib/auth";
import { jstYearMonth } from "../lib/date";
import { prisma } from "../lib/prisma";
import type { Role } from "../lib/generated/prisma/enums";

export const SEED_PASSWORD = "password1234";

type SeedUser = {
  name: string;
  email: string;
  role: Role;
  hasKey: boolean;
  dailyTransportCost: number;
  transportCostLimit: number;
};

export const seedUsers: SeedUser[] = [
  {
    name: "管理 太郎",
    email: "admin@example.com",
    role: "ADMIN",
    hasKey: true,
    dailyTransportCost: 800,
    transportCostLimit: 15000,
  },
  {
    name: "出社 花子",
    email: "member1@example.com",
    role: "MEMBER",
    hasKey: true,
    dailyTransportCost: 1200,
    transportCostLimit: 20000,
  },
  {
    name: "在宅 次郎",
    email: "member2@example.com",
    role: "MEMBER",
    hasKey: false,
    dailyTransportCost: 600,
    transportCostLimit: 10000,
  },
  {
    name: "新人 三佳",
    email: "member3@example.com",
    role: "MEMBER",
    hasKey: false,
    dailyTransportCost: 450,
    transportCostLimit: 0,
  },
];

// タイムゾーンを持たない日付（@db.Date）として保存される値を作る
function dateOf(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export async function seed() {
  // 冪等にするため既存データを全削除（依存順）
  await prisma.attendanceDay.deleteMany();
  await prisma.companyDay.deleteMany();
  await prisma.companyWeekdayRule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // Better Auth API 経由で作成する（パスワードが正しくハッシュ化され、実際にログインできる）
  for (const user of seedUsers) {
    await auth.api.signUpEmail({
      body: {
        name: user.name,
        email: user.email,
        password: SEED_PASSWORD,
      },
    });
    // additionalFields は input: false のため signUp では渡せない。作成後に更新する
    await prisma.user.update({
      where: { email: user.email },
      data: {
        emailVerified: true,
        role: user.role,
        hasKey: user.hasKey,
        dailyTransportCost: user.dailyTransportCost,
        transportCostLimit: user.transportCostLimit,
      },
    });
  }

  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });
  const byEmail = (email: string) => {
    const found = users.find((u) => u.email === email);
    if (!found) throw new Error(`seed user not found: ${email}`);
    return found.id;
  };

  // 当月（JST）のサンプル出社予定（時刻は "HH:mm"・30分刻み・任意）
  // 注意: day は月によって存在しない日付（29〜31）を使わないこと（28 以下のみ）
  const { year, month } = jstYearMonth();
  const attendance: {
    email: string;
    day: number;
    comment: string | null;
    startTime?: string;
    endTime?: string;
  }[] = [
    {
      email: "admin@example.com",
      day: 2,
      comment: "定例MTGのため出社",
      startTime: "09:00",
      endTime: "17:30",
    },
    { email: "admin@example.com", day: 9, comment: null },
    { email: "admin@example.com", day: 16, comment: "鍵開けます" },
    {
      email: "member1@example.com",
      day: 2,
      comment: "ランチ行きましょう",
      startTime: "11:30",
    },
    { email: "member1@example.com", day: 9, comment: "午後から出社" },
    { email: "member1@example.com", day: 24, comment: null },
    {
      email: "member2@example.com",
      day: 9,
      comment: "相談したいことがあります",
      endTime: "16:00",
    },
    { email: "member3@example.com", day: 16, comment: "初出社です" },
  ];
  await prisma.attendanceDay.createMany({
    data: attendance.map((a) => ({
      userId: byEmail(a.email),
      date: dateOf(year, month, a.day),
      comment: a.comment,
      startTime: a.startTime ?? null,
      endTime: a.endTime ?? null,
    })),
  });

  // 当月（JST）のサンプル会社カレンダー
  await prisma.companyDay.createMany({
    data: [
      { date: dateOf(year, month, 2), type: "OFFICE_DAY", label: "全社出社日" },
      {
        date: dateOf(year, month, 16),
        type: "OFFICE_DAY",
        label: "全社出社日",
      },
      { date: dateOf(year, month, 20), type: "HOLIDAY", label: "創立記念日" },
    ],
  });

  return {
    users: await prisma.user.count(),
    attendanceDays: await prisma.attendanceDay.count(),
    companyDays: await prisma.companyDay.count(),
  };
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  seed()
    .then((counts) => {
      console.log("シード投入が完了しました:", counts);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
