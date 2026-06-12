import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "ログイン | 出社予定カレンダー",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
