import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// セッション Cookie の有無による楽観的な認証ガード。
// Cookie の検証・ロール判定はサーバー側（lib/session.ts の requireAuth / requireAdmin）で行う。
// 注意: リダイレクト先は固定パスのみにすること。クエリ等の外部入力をリダイレクト先に
// 使う場合（ログイン後に元のページへ戻す機能など）は、必ずサーバー側で検証する。
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  // app/(auth)/login はルートグループのため実パスは /login
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!sessionCookie && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // 注意: 「Cookie があれば /login → / へ戻す」を proxy でやってはいけない。
  // Cookie の存在はセッションの有効性を保証しないため、無効な Cookie が残っていると
  // サーバー側ガード（/ → /login）との間で無限リダイレクトループになる。
  // ログイン済みユーザーを /login から戻す処理は、セッションを検証できる
  // ログインページ（app/(auth)/login/page.tsx）側で行う。
  return NextResponse.next();
}

export const config = {
  // Better Auth のエンドポイント（/api/auth/ 配下のみ）と静的アセットを除くすべてに適用。
  // アプリ独自の /api/ ルートを追加する場合は proxy の対象になるが、
  // ルートハンドラ自身でもサーバー側の認証チェックを必ず行うこと。
  matcher: [
    "/((?!api/auth/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
