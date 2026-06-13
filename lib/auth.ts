import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";

import { prisma } from "./prisma";

// アプリの Prisma enum（ADMIN / MEMBER）をプラグインのロールとして登録する。
// 権限はプラグイン標準（admin 相当 / user 相当）をそのまま割り当てる
const ac = createAccessControl(defaultStatements);
const accessRoles = {
  ADMIN: ac.newRole(adminAc.statements),
  MEMBER: ac.newRole(userAc.statements),
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    // role は admin プラグインが管理する（adminRoles / defaultRole で設定）
    additionalFields: {
      hasKey: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      dailyTransportCost: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      transportCostLimit: {
        type: "number",
        defaultValue: 0,
        input: false,
      },
      notifyEmail: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
      notifySlack: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    // 管理者によるユーザー作成・パスワード再設定・セッション失効（#7）
    admin({
      ac,
      roles: accessRoles,
      defaultRole: "MEMBER",
      adminRoles: ["ADMIN"],
    }),
    // Server Actions から signIn/signOut した際に Set-Cookie を反映する（必ず最後に置く）
    nextCookies(),
  ],
});
