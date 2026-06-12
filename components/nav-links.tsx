"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const baseLinks = [
  { href: "/", label: "カレンダー" },
  { href: "/profile", label: "プロフィール" },
];

const adminLink = { href: "/admin", label: "管理" };

// ロール別のリンク出し分けは表示のみ。/admin のアクセス制御はサーバー側ガード（#3）が担う
export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...baseLinks, adminLink] : baseLinks;

  return (
    <nav aria-label="メインナビゲーション" className="flex items-center gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "hover:bg-accent rounded-md px-3 py-1.5 text-sm transition-colors",
              isActive ? "bg-accent font-medium" : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
