import { ProfileForm } from "@/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
  calcMonthlyCost,
  jstMonthRange,
  shouldShowLimitAlert,
} from "@/lib/transport-cost";

export const metadata = {
  title: "プロフィール | 出社予定カレンダー",
};

export default async function ProfilePage() {
  const session = await requireAuth();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      dailyTransportCost: true,
      transportCostLimit: true,
      notifyEmail: true,
      notifySlack: true,
    },
  });

  const { start, end } = jstMonthRange();
  const attendanceCount = await prisma.attendanceDay.count({
    where: { userId: session.user.id, date: { gte: start, lt: end } },
  });

  const monthlyCost = calcMonthlyCost(attendanceCount, user.dailyTransportCost);
  const showAlert = shouldShowLimitAlert(monthlyCost, user.transportCostLimit);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">プロフィール</h1>

      <Card>
        <CardHeader>
          <CardTitle>当月の交通費サマリ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {showAlert && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              想定交通費が月次上限の80%を超えています（上限:{" "}
              {user.transportCostLimit.toLocaleString()} 円）
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">当月の出社登録日数</dt>
            <dd>{attendanceCount} 日</dd>
            <dt className="text-muted-foreground">想定交通費</dt>
            <dd>{monthlyCost.toLocaleString()} 円</dd>
            <dt className="text-muted-foreground">月次上限（管理者設定）</dt>
            <dd>
              {user.transportCostLimit > 0
                ? `${user.transportCostLimit.toLocaleString()} 円`
                : "未設定"}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>設定</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            dailyTransportCost={user.dailyTransportCost}
            notifyEmail={user.notifyEmail}
            notifySlack={user.notifySlack}
          />
        </CardContent>
      </Card>
    </main>
  );
}
