"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  isCompanyDayType,
  isRole,
  validateCompanyDayLabel,
  validateEmail,
  validatePassword,
  validateRoleChange,
  validateTransportCostLimit,
  validateUserName,
  type CompanyDayType,
  type Role,
} from "@/lib/admin";
import { type CompanyDayItem } from "@/lib/attendance";
import { auth } from "@/lib/auth";
import { isWeekday, type WeekdayRuleItem } from "@/lib/company-calendar";
import { parseDateString, toDateString } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type AdminActionResult = {
  error?: string;
};

export type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  hasKey: boolean;
  transportCostLimit: number;
};

export type UserInput = {
  name: string;
  email: string;
  role: string;
  hasKey: boolean;
  transportCostLimit: number;
};

// ユーザー入力（氏名・メール・ロール・上限交通費）の共通検証。
// 各 validate 関数は「成功 = null / 失敗 = エラーメッセージ」を返す規約のため ?? で連結できる
function validateUserInput(input: UserInput): string | null {
  return (
    validateUserName(input.name) ??
    validateEmail(input.email) ??
    (isRole(input.role) ? null : "ロールが不正です") ??
    validateTransportCostLimit(input.transportCostLimit)
  );
}

// ユーザー一覧（管理画面用）
export async function getAdminUsers(): Promise<AdminUserItem[]> {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hasKey: true,
      transportCostLimit: true,
    },
  });
  return users;
}

// ユーザー追加（Better Auth admin API で作成し、アプリ拡張フィールドを更新する）
export async function createUser(
  input: UserInput & { password: string },
): Promise<AdminActionResult> {
  await requireAdmin();

  const error = validateUserInput(input) ?? validatePassword(input.password);
  if (error) {
    return { error };
  }

  let createdUserId: string;
  try {
    const created = await auth.api.createUser({
      body: {
        name: input.name.trim(),
        email: input.email,
        password: input.password,
        role: input.role as Role,
      },
      headers: await headers(),
    });
    createdUserId = created.user.id;
  } catch (e) {
    if (e instanceof APIError) {
      if (e.body?.code === "USER_ALREADY_EXISTS") {
        return { error: "このメールアドレスは既に使用されています" };
      }
      return { error: "ユーザーを作成できませんでした" };
    }
    throw e;
  }

  // additionalFields は input: false のため作成後に更新する（シードと同パターン）。
  // 管理者が作成するユーザーのためメール確認は済みとして扱う
  try {
    await prisma.user.update({
      where: { id: createdUserId },
      data: {
        hasKey: input.hasKey,
        transportCostLimit: input.transportCostLimit,
        emailVerified: true,
      },
    });
  } catch {
    // 中途半端なユーザーが残ると再試行がメール重複で詰まるため、作成分を取り消す
    await prisma.user.delete({ where: { id: createdUserId } });
    return { error: "ユーザーを作成できませんでした" };
  }

  revalidatePath("/admin");
  return {};
}

// ユーザー編集（氏名・メール・ロール・鍵所持・上限交通費）
export async function updateUser(
  userId: string,
  input: UserInput,
): Promise<AdminActionResult> {
  const session = await requireAdmin();

  const error = validateUserInput(input);
  if (error) {
    return { error };
  }
  const roleError = validateRoleChange({
    actorId: session.user.id,
    targetId: userId,
    newRole: input.role as Role,
  });
  if (roleError) {
    return { error: roleError };
  }

  try {
    // メール変更時も emailVerified は維持する（自由サインアップなし・管理者が確認済みとして
    // 登録する運用のため。自己パスワードリセット等を導入する際は再検証を検討すること）
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name.trim(),
        email: input.email,
        role: input.role as Role,
        hasKey: input.hasKey,
        transportCostLimit: input.transportCostLimit,
      },
    });
  } catch (e) {
    // メールの unique 制約違反
    if ((e as { code?: string }).code === "P2002") {
      return { error: "このメールアドレスは既に使用されています" };
    }
    throw e;
  }

  revalidatePath("/admin");
  return {};
}

// パスワード再設定（管理者による）。再設定後は対象ユーザーの既存セッションを失効させる。
// ただし自分自身への再設定では失効させない（操作中の管理者が締め出されるのを防ぐ。
// MVP では管理者が自分のパスワードを変える唯一の手段のため自己対象も許可する）
export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<AdminActionResult> {
  const session = await requireAdmin();

  const error = validatePassword(newPassword);
  if (error) {
    return { error };
  }

  const requestHeaders = await headers();
  try {
    await auth.api.setUserPassword({
      body: { userId, newPassword },
      headers: requestHeaders,
    });
    if (userId !== session.user.id) {
      await auth.api.revokeUserSessions({
        body: { userId },
        headers: requestHeaders,
      });
    }
  } catch (e) {
    if (e instanceof APIError) {
      return { error: "パスワードを再設定できませんでした" };
    }
    throw e;
  }

  return {};
}

// 指定月の会社カレンダー一覧（管理画面用）
export async function getCompanyDays(
  year: number,
  month: number,
): Promise<CompanyDayItem[]> {
  await requireAdmin();

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("不正な年月です");
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const companyDays = await prisma.companyDay.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
  });
  return companyDays.map((c) => ({
    date: toDateString(c.date),
    type: c.type,
    label: c.label,
  }));
}

export type CompanyDayInput = {
  date: string;
  type: string;
  label: string;
};

// 会社カレンダーの追加・更新（同一日は上書き）
export async function saveCompanyDay(
  input: CompanyDayInput,
): Promise<AdminActionResult> {
  await requireAdmin();

  const date = parseDateString(input.date);
  if (!date) {
    return { error: "不正な日付です" };
  }
  if (!isCompanyDayType(input.type)) {
    return { error: "種別が不正です" };
  }
  const trimmedLabel = input.label.trim();
  const labelError = validateCompanyDayLabel(trimmedLabel);
  if (labelError) {
    return { error: labelError };
  }

  const data = {
    type: input.type as CompanyDayType,
    label: trimmedLabel === "" ? null : trimmedLabel,
  };
  await prisma.companyDay.upsert({
    where: { date },
    create: { date, ...data },
    update: data,
  });

  revalidatePath("/admin");
  return {};
}

// 会社カレンダーの削除（未登録の場合は何もしない）
export async function deleteCompanyDay(
  dateStr: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const date = parseDateString(dateStr);
  if (!date) {
    return { error: "不正な日付です" };
  }

  await prisma.companyDay.deleteMany({ where: { date } });

  revalidatePath("/admin");
  return {};
}

// 曜日ルール一覧（管理画面用）
export async function getWeekdayRules(): Promise<WeekdayRuleItem[]> {
  await requireAdmin();

  const rules = await prisma.companyWeekdayRule.findMany({
    orderBy: { weekday: "asc" },
    select: { weekday: true, type: true, label: true },
  });
  return rules;
}

export type WeekdayRuleInput = {
  weekday: number;
  type: string;
  label: string;
};

// 曜日ルールの追加・更新（同一曜日は上書き）
export async function saveWeekdayRule(
  input: WeekdayRuleInput,
): Promise<AdminActionResult> {
  await requireAdmin();

  if (!isWeekday(input.weekday)) {
    return { error: "曜日が不正です" };
  }
  if (!isCompanyDayType(input.type)) {
    return { error: "種別が不正です" };
  }
  const trimmedLabel = input.label.trim();
  const labelError = validateCompanyDayLabel(trimmedLabel);
  if (labelError) {
    return { error: labelError };
  }

  const data = {
    type: input.type as CompanyDayType,
    label: trimmedLabel === "" ? null : trimmedLabel,
  };
  await prisma.companyWeekdayRule.upsert({
    where: { weekday: input.weekday },
    create: { weekday: input.weekday, ...data },
    update: data,
  });

  revalidatePath("/admin");
  return {};
}

// 曜日ルールの削除（未登録の場合は何もしない）
export async function deleteWeekdayRule(
  weekday: number,
): Promise<AdminActionResult> {
  await requireAdmin();

  if (!isWeekday(weekday)) {
    return { error: "曜日が不正です" };
  }

  await prisma.companyWeekdayRule.deleteMany({ where: { weekday } });

  revalidatePath("/admin");
  return {};
}
