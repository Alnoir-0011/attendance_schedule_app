import { AdminCompanyCalendar } from "@/components/admin-company-calendar";
import { AdminUsers } from "@/components/admin-users";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAdminUsers,
  getCompanyDays,
  getWeekdayRules,
} from "@/lib/actions/admin";
import { jstYearMonth } from "@/lib/date";
import { requireAdmin } from "@/lib/session";

export const metadata = {
  title: "管理画面 | 出社予定カレンダー",
};

export default async function AdminPage() {
  // 各 Action（getAdminUsers 等）も内部で requireAdmin を呼ぶが、ページ自体のガードとして
  // ここでも明示する（多層防御。getSession は cache() 済みのため DB アクセスは増えない）
  const session = await requireAdmin();

  const { year, month } = jstYearMonth();
  const [users, companyDays, weekdayRules] = await Promise.all([
    getAdminUsers(),
    getCompanyDays(year, month),
    getWeekdayRules(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">管理画面</h1>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">ユーザー管理</TabsTrigger>
          <TabsTrigger value="calendar">会社カレンダー</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <AdminUsers users={users} currentUserId={session.user.id} />
        </TabsContent>
        <TabsContent value="calendar">
          <AdminCompanyCalendar
            initialYear={year}
            initialMonth={month}
            initialDays={companyDays}
            initialRules={weekdayRules}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
