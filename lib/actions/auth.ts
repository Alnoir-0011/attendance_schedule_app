"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = formData.get("email");
  const password = formData.get("password");

  if (typeof rawEmail !== "string" || typeof password !== "string") {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  // コピペ時の前後空白を除去（パスワードは意図的なスペースを許容するため trim しない）
  const email = rawEmail.trim();
  if (email === "" || password === "") {
    return { error: "メールアドレスとパスワードを入力してください" };
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      // セッションに ipAddress / userAgent を記録するため headers を渡す
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "メールアドレスまたはパスワードが正しくありません" };
    }
    throw error;
  }

  redirect("/");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
