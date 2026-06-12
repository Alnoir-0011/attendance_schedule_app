import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "ログイン | 出社予定カレンダー",
};

export default async function LoginPage() {
  // ログイン済み（サーバー側で検証済みの有効なセッション）ならトップへ戻す。
  // Cookie の有無だけで判定する proxy ではなくここで行うことで、
  // 無効な Cookie が残っている場合のリダイレクトループを防ぐ
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
