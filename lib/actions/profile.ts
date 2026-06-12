"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// 1日あたり交通費の上限（入力ミス防止のための暫定値）
const DAILY_TRANSPORT_COST_MAX = 100_000;

export type ProfileFormState = {
  error?: string;
  success?: boolean;
};

// 自分のプロフィール設定（日額交通費・通知オン/オフ）を更新する。
// 通知設定は値の保持のみ（配信は #8）。transportCostLimit は管理者設定のためここでは扱わない
export async function updateProfileSettings(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireAuth();

  const rawCost = formData.get("dailyTransportCost");
  if (typeof rawCost !== "string" || rawCost.trim() === "") {
    return { error: "1日あたり交通費を入力してください" };
  }
  const dailyTransportCost = Number(rawCost);
  if (
    !Number.isInteger(dailyTransportCost) ||
    dailyTransportCost < 0 ||
    dailyTransportCost > DAILY_TRANSPORT_COST_MAX
  ) {
    return {
      error: `1日あたり交通費は 0〜${DAILY_TRANSPORT_COST_MAX.toLocaleString("ja-JP")} 円の整数で入力してください`,
    };
  }

  // チェックボックスは ON のときのみ値が送信される
  const notifyEmail = formData.get("notifyEmail") === "on";
  const notifySlack = formData.get("notifySlack") === "on";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dailyTransportCost, notifyEmail, notifySlack },
  });

  revalidatePath("/profile");
  return { success: true };
}
