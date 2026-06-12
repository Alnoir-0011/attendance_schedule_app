import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { prisma } from "./prisma";

// Better Auth 設定（最小構成。本格的な認証実装は #3 で行う）
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "MEMBER",
        input: false,
      },
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
});
