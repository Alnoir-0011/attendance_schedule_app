import { describe, expect, it } from "vitest";

import {
  COMPANY_DAY_LABEL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_NAME_MAX_LENGTH,
  isCompanyDayType,
  isRole,
  validateCompanyDayLabel,
  validateEmail,
  validatePassword,
  validateRoleChange,
  validateTransportCostLimit,
  validateUserName,
} from "@/lib/admin";

describe("validateUserName", () => {
  it("通常の氏名は許可される", () => {
    expect(validateUserName("出社 花子")).toBeNull();
  });

  it("上限文字数ちょうどは許可される", () => {
    expect(validateUserName("あ".repeat(USER_NAME_MAX_LENGTH))).toBeNull();
  });

  it("空文字・空白のみはエラーになる", () => {
    expect(validateUserName("")).toBe("氏名を入力してください");
    expect(validateUserName("   ")).toBe("氏名を入力してください");
  });

  it("上限文字数を超えるとエラーになる", () => {
    expect(validateUserName("あ".repeat(USER_NAME_MAX_LENGTH + 1))).toBe(
      `氏名は${USER_NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  });
});

describe("validateEmail", () => {
  it("一般的なメールアドレスは許可される", () => {
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("user+tag@sub.example.co.jp")).toBeNull();
  });

  it("空文字はエラーになる", () => {
    expect(validateEmail("")).toBe("メールアドレスを入力してください");
  });

  it("形式が不正な場合はエラーになる", () => {
    const error = "メールアドレスの形式が正しくありません";
    expect(validateEmail("user")).toBe(error);
    expect(validateEmail("user@")).toBe(error);
    expect(validateEmail("@example.com")).toBe(error);
    expect(validateEmail("user@example")).toBe(error);
    expect(validateEmail("user name@example.com")).toBe(error);
  });
});

describe("validatePassword", () => {
  it("最小文字数ちょうどは許可される", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it("最小文字数未満はエラーになる", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(
      `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`,
    );
    expect(validatePassword("")).toBe(
      `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`,
    );
  });
});

describe("validateTransportCostLimit", () => {
  it("0 と正の整数は許可される（0 = 未設定）", () => {
    expect(validateTransportCostLimit(0)).toBeNull();
    expect(validateTransportCostLimit(20000)).toBeNull();
  });

  it("負数・小数・NaN はエラーになる", () => {
    const error = "上限交通費は0円以上の整数で入力してください";
    expect(validateTransportCostLimit(-1)).toBe(error);
    expect(validateTransportCostLimit(1.5)).toBe(error);
    expect(validateTransportCostLimit(Number.NaN)).toBe(error);
  });
});

describe("isRole", () => {
  it("ADMIN / MEMBER のみ true になる", () => {
    expect(isRole("ADMIN")).toBe(true);
    expect(isRole("MEMBER")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole("")).toBe(false);
    expect(isRole("OWNER")).toBe(false);
  });
});

describe("validateRoleChange", () => {
  it("他人のロール変更は昇格・降格とも許可される", () => {
    expect(
      validateRoleChange({
        actorId: "admin-1",
        targetId: "user-1",
        newRole: "MEMBER",
      }),
    ).toBeNull();
    expect(
      validateRoleChange({
        actorId: "admin-1",
        targetId: "user-1",
        newRole: "ADMIN",
      }),
    ).toBeNull();
  });

  it("自分自身を ADMIN のまま保つ変更は許可される", () => {
    expect(
      validateRoleChange({
        actorId: "admin-1",
        targetId: "admin-1",
        newRole: "ADMIN",
      }),
    ).toBeNull();
  });

  it("自分自身の MEMBER への降格はエラーになる", () => {
    expect(
      validateRoleChange({
        actorId: "admin-1",
        targetId: "admin-1",
        newRole: "MEMBER",
      }),
    ).toBe("自分自身のロールを MEMBER に変更することはできません");
  });
});

describe("isCompanyDayType", () => {
  it("OFFICE_DAY / HOLIDAY のみ true になる", () => {
    expect(isCompanyDayType("OFFICE_DAY")).toBe(true);
    expect(isCompanyDayType("HOLIDAY")).toBe(true);
    expect(isCompanyDayType("holiday")).toBe(false);
    expect(isCompanyDayType("")).toBe(false);
  });
});

describe("validateCompanyDayLabel", () => {
  it("空文字（ラベル任意）と上限文字数ちょうどは許可される", () => {
    expect(validateCompanyDayLabel("")).toBeNull();
    expect(
      validateCompanyDayLabel("あ".repeat(COMPANY_DAY_LABEL_MAX_LENGTH)),
    ).toBeNull();
  });

  it("上限文字数を超えるとエラーになる", () => {
    expect(
      validateCompanyDayLabel("あ".repeat(COMPANY_DAY_LABEL_MAX_LENGTH + 1)),
    ).toBe(`ラベルは${COMPANY_DAY_LABEL_MAX_LENGTH}文字以内で入力してください`);
  });
});
