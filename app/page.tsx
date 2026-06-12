import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { requireAuth } from "@/lib/session";

export default async function Home() {
  const session = await requireAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">出社予定カレンダー</h1>
      <p className="text-muted-foreground">
        {session.user.name} さんとしてログイン中（カレンダーは #5 で実装）
      </p>
      <form action={logout}>
        <Button type="submit" variant="outline">
          ログアウト
        </Button>
      </form>
    </main>
  );
}
