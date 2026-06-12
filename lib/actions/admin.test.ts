import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createUser,
  deleteCompanyDay,
  getAdminUsers,
  getCompanyDays,
  resetUserPassword,
  saveCompanyDay,
  updateUser,
} from "@/lib/actions/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    companyDay: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      createUser: vi.fn(),
      setUserPassword: vi.fn(),
      revokeUserSessions: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const ADMIN_SESSION = {
  user: { id: "admin-1", role: "ADMIN" },
} as Awaited<ReturnType<typeof requireAdmin>>;

const validUserInput = {
  name: "新規 太郎",
  email: "new-user@example.com",
  role: "MEMBER",
  hasKey: false,
  transportCostLimit: 10000,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue(ADMIN_SESSION);
});

describe("管理系 Action の権限チェック", () => {
  // requireAdmin は member / 未認証時に redirect を throw する（lib/session.ts）
  const redirectError = new Error("NEXT_REDIRECT");

  const actions: [string, () => Promise<unknown>][] = [
    ["getAdminUsers", () => getAdminUsers()],
    [
      "createUser",
      () => createUser({ ...validUserInput, password: "password1234" }),
    ],
    ["updateUser", () => updateUser("user-1", validUserInput)],
    ["resetUserPassword", () => resetUserPassword("user-1", "newpass1234")],
    ["getCompanyDays", () => getCompanyDays(2026, 6)],
    [
      "saveCompanyDay",
      () => saveCompanyDay({ date: "2026-06-21", type: "HOLIDAY", label: "" }),
    ],
    ["deleteCompanyDay", () => deleteCompanyDay("2026-06-21")],
  ];

  it.each(actions)(
    "%s は requireAdmin で拒否されると DB / auth API に触れない",
    async (_name, run) => {
      vi.mocked(requireAdmin).mockRejectedValue(redirectError);

      await expect(run()).rejects.toThrow("NEXT_REDIRECT");

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.companyDay.findMany).not.toHaveBeenCalled();
      expect(prisma.companyDay.upsert).not.toHaveBeenCalled();
      expect(prisma.companyDay.deleteMany).not.toHaveBeenCalled();
      expect(auth.api.createUser).not.toHaveBeenCalled();
      expect(auth.api.setUserPassword).not.toHaveBeenCalled();
      expect(auth.api.revokeUserSessions).not.toHaveBeenCalled();
    },
  );
});

describe("createUser", () => {
  it("Better Auth でユーザーを作成し、追加フィールドを更新する", async () => {
    vi.mocked(auth.api.createUser).mockResolvedValue({
      user: { id: "new-1" },
    } as never);

    const result = await createUser({
      ...validUserInput,
      password: "password1234",
    });

    expect(result).toEqual({});
    expect(auth.api.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "新規 太郎",
          email: "new-user@example.com",
          password: "password1234",
          role: "MEMBER",
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "new-1" },
        data: expect.objectContaining({
          hasKey: false,
          transportCostLimit: 10000,
          emailVerified: true,
        }),
      }),
    );
  });

  it("入力が不正な場合はエラーを返し、ユーザーを作成しない", async () => {
    const result = await createUser({
      ...validUserInput,
      name: "",
      password: "password1234",
    });

    expect(result).toEqual({ error: "氏名を入力してください" });
    expect(auth.api.createUser).not.toHaveBeenCalled();
  });

  it("パスワードが短い場合はエラーを返す", async () => {
    const result = await createUser({ ...validUserInput, password: "short" });

    expect(result).toEqual({
      error: "パスワードは8文字以上で入力してください",
    });
    expect(auth.api.createUser).not.toHaveBeenCalled();
  });
});

describe("updateUser", () => {
  it("氏名・メール・ロール・鍵所持・上限交通費を更新する", async () => {
    const result = await updateUser("user-1", {
      ...validUserInput,
      role: "ADMIN",
      hasKey: true,
    });

    expect(result).toEqual({});
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          name: "新規 太郎",
          email: "new-user@example.com",
          role: "ADMIN",
          hasKey: true,
          transportCostLimit: 10000,
        }),
      }),
    );
  });

  it("自分自身の MEMBER への降格はエラーを返し、更新しない", async () => {
    const result = await updateUser("admin-1", {
      ...validUserInput,
      role: "MEMBER",
    });

    expect(result).toEqual({
      error: "自分自身のロールを MEMBER に変更することはできません",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("メールアドレスが重複している場合はエラーを返す", async () => {
    vi.mocked(prisma.user.update).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const result = await updateUser("user-1", validUserInput);

    expect(result).toEqual({
      error: "このメールアドレスは既に使用されています",
    });
  });
});

describe("resetUserPassword", () => {
  it("パスワードを再設定し、既存セッションを失効させる", async () => {
    const result = await resetUserPassword("user-1", "newpass1234");

    expect(result).toEqual({});
    expect(auth.api.setUserPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          userId: "user-1",
          newPassword: "newpass1234",
        }),
      }),
    );
    expect(auth.api.revokeUserSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });

  it("パスワードが短い場合はエラーを返し、再設定しない", async () => {
    const result = await resetUserPassword("user-1", "short");

    expect(result).toEqual({
      error: "パスワードは8文字以上で入力してください",
    });
    expect(auth.api.setUserPassword).not.toHaveBeenCalled();
    expect(auth.api.revokeUserSessions).not.toHaveBeenCalled();
  });
});

describe("saveCompanyDay", () => {
  it("日付・種別・ラベルで upsert する（ラベル空文字は null に正規化）", async () => {
    const result = await saveCompanyDay({
      date: "2026-06-21",
      type: "HOLIDAY",
      label: "",
    });

    expect(result).toEqual({});
    expect(prisma.companyDay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: new Date("2026-06-21T00:00:00Z") },
        create: expect.objectContaining({ type: "HOLIDAY", label: null }),
        update: expect.objectContaining({ type: "HOLIDAY", label: null }),
      }),
    );
  });

  it("不正な日付はエラーを返す", async () => {
    const result = await saveCompanyDay({
      date: "2026-02-30",
      type: "HOLIDAY",
      label: "",
    });

    expect(result).toEqual({ error: "不正な日付です" });
    expect(prisma.companyDay.upsert).not.toHaveBeenCalled();
  });
});

describe("deleteCompanyDay", () => {
  it("指定日の会社カレンダーを削除する", async () => {
    const result = await deleteCompanyDay("2026-06-21");

    expect(result).toEqual({});
    expect(prisma.companyDay.deleteMany).toHaveBeenCalledWith({
      where: { date: new Date("2026-06-21T00:00:00Z") },
    });
  });
});
