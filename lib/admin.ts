// 管理画面（ユーザー管理・会社カレンダー）の純粋ロジック（Server Action と UI の双方から使用）

export const USER_NAME_MAX_LENGTH = 50;
// Better Auth の emailAndPassword デフォルト最小長に合わせる
export const PASSWORD_MIN_LENGTH = 8;
export const COMPANY_DAY_LABEL_MAX_LENGTH = 50;

export type Role = "ADMIN" | "MEMBER";
export type CompanyDayType = "OFFICE_DAY" | "HOLIDAY";

export function validateUserName(name: string): string | null {
  if (name.trim() === "") {
    return "氏名を入力してください";
  }
  if (name.length > USER_NAME_MAX_LENGTH) {
    return `氏名は${USER_NAME_MAX_LENGTH}文字以内で入力してください`;
  }
  return null;
}

// 厳密な RFC 検証はせず「@ の前後に空白なし・ドメインにドットあり」の最低限のみ確認する
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (email === "") {
    return "メールアドレスを入力してください";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "メールアドレスの形式が正しくありません";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`;
  }
  return null;
}

export function validateTransportCostLimit(value: number): string | null {
  if (!Number.isInteger(value) || value < 0) {
    return "上限交通費は0円以上の整数で入力してください";
  }
  return null;
}

export function isRole(value: string): value is Role {
  return value === "ADMIN" || value === "MEMBER";
}

// 管理者不在を防ぐため、自分自身の MEMBER への降格は禁止する
export function validateRoleChange(params: {
  actorId: string;
  targetId: string;
  newRole: Role;
}): string | null {
  if (params.actorId === params.targetId && params.newRole === "MEMBER") {
    return "自分自身のロールを MEMBER に変更することはできません";
  }
  return null;
}

export function isCompanyDayType(value: string): value is CompanyDayType {
  return value === "OFFICE_DAY" || value === "HOLIDAY";
}

export function validateCompanyDayLabel(label: string): string | null {
  if (label.length > COMPANY_DAY_LABEL_MAX_LENGTH) {
    return `ラベルは${COMPANY_DAY_LABEL_MAX_LENGTH}文字以内で入力してください`;
  }
  return null;
}
