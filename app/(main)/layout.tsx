import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import type { Role } from "@/lib/generated/prisma/enums";
import { getSession } from "@/lib/session";

// 認証済みページ共通のレイアウト（ヘッダー + コンテンツ領域）。
// ここでの session チェックはヘッダー表示用。各ページの requireAuth / requireAdmin は省略しないこと
export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) {
    // proxy.ts でもリダイレクトするが、proxy を経由しないケースへのフォールバックとして残す
    redirect("/login");
  }

  return (
    <>
      <AppHeader
        user={{
          name: session.user.name,
          // Better Auth の additionalFields は string 型のため、境界で Role に絞る
          role: session.user.role as Role,
        }}
      />
      {children}
    </>
  );
}
