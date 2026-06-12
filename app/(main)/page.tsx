import { AttendanceCalendar } from "@/components/attendance-calendar";
import { requireAuth } from "@/lib/session";

export default async function CalendarPage() {
  const session = await requireAuth();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-4 text-2xl font-bold">出社予定カレンダー</h1>
      <AttendanceCalendar currentUserId={session.user.id} />
    </main>
  );
}
