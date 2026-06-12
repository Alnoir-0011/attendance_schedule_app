import Link from "next/link";

import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { isAdmin } from "@/lib/authz";
import type { Role } from "@/lib/generated/prisma/enums";

type Props = {
  user: {
    name: string;
    role: Role;
  };
};

// Server Component 前提（logout Server Action を form action に直渡ししているため。
// "use client" 化する場合は logout の渡し方を見直すこと）
export function AppHeader({ user }: Props) {
  return (
    <header className="border-b">
      {/* flex-wrap: 幅が足りない場合はナビを折り返す */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-bold">
          出社予定カレンダー
        </Link>
        <NavLinks isAdmin={isAdmin(user)} />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {user.name} さん
          </span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              ログアウト
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
