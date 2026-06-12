import { requireAuth } from "@/lib/session";

export const metadata = {
  title: "プロフィール | 出社予定カレンダー",
};

export default async function ProfilePage() {
  await requireAuth();

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">プロフィール</h1>
      <p className="text-muted-foreground">
        交通費・通知設定と当月サマリは #6 で実装します。
      </p>
    </main>
  );
}
