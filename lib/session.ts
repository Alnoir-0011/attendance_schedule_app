import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";
import { isAdmin } from "./authz";

// 同一リクエスト内での重複取得を避けるため cache でメモ化する
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

// 未認証なら /login へリダイレクトする
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// admin 以外はトップへリダイレクトする
export async function requireAdmin() {
  const session = await requireAuth();
  if (!isAdmin(session.user)) {
    redirect("/");
  }
  return session;
}
