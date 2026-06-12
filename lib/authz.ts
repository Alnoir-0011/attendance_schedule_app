// 権限判定ユーティリティ（サーバー側のガードから使用する）

export function isAdmin(user: { role: string }): boolean {
  return user.role === "ADMIN";
}
