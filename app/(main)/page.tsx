import { requireAuth } from "@/lib/session";

export default async function Home() {
  await requireAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">出社予定カレンダー</h1>
      <p className="text-muted-foreground">カレンダーは #5 で実装します。</p>
    </main>
  );
}
