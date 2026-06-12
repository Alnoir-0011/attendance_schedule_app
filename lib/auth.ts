import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL,
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
  // Server Actions から signIn/signOut した際に Set-Cookie を反映する（必ず最後に置く）
  plugins: [nextCookies()],
});
