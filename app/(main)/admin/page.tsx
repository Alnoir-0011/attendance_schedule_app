import { requireAdmin } from "@/lib/session";

export const metadata = {
  title: "管理画面 | 出社予定カレンダー",
};

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">管理画面</h1>
      <p className="text-muted-foreground">
        ユーザー管理・会社カレンダーの指定は #7 で実装します。
      </p>
    </main>
  );
}
