// 権限判定ユーティリティ（サーバー側のガードから使用する）

// role は Better Auth admin プラグインの型定義上 nullable のため広めに受ける
export function isAdmin(user: { role?: string | null }): boolean {
  return user.role === "ADMIN";
}
