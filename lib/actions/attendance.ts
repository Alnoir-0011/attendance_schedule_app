"use server";

import {
  validateComment,
  validateTimeRange,
  type AttendanceItem,
  type CompanyDayItem,
} from "@/lib/attendance";
import { mergeCompanyDays } from "@/lib/company-calendar";
import { parseDateString, toDateString } from "@/lib/date";
import { listHolidaysInRange } from "@/lib/holidays";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// FullCalendar の月表示は最大6週（42日）。それを超える取得は不正とみなす
const MAX_RANGE_DAYS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CalendarData = {
  attendances: AttendanceItem[];
  companyDays: CompanyDayItem[];
};

// 表示範囲（FullCalendar の visible range。end は排他）の全員の出社予定と会社カレンダーを取得
export async function getCalendarData(
  startStr: string,
  endStr: string,
): Promise<CalendarData> {
  await requireAuth();

  const start = parseDateString(startStr);
  const end = parseDateString(endStr);
  if (!start || !end) {
    throw new Error("不正な日付形式です");
  }
  const rangeDays = (end.getTime() - start.getTime()) / DAY_MS;
  if (rangeDays <= 0 || rangeDays > MAX_RANGE_DAYS) {
    throw new Error("不正な取得範囲です");
  }

  const [attendances, companyDays, weekdayRules] = await Promise.all([
    prisma.attendanceDay.findMany({
      where: { date: { gte: start, lt: end } },
      include: { user: { select: { name: true, hasKey: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.companyDay.findMany({
      where: { date: { gte: start, lt: end } },
    }),
    prisma.companyWeekdayRule.findMany({
      select: { weekday: true, type: true, label: true },
    }),
  ]);

  return {
    attendances: attendances.map((a) => ({
      id: a.id,
      userId: a.userId,
      date: toDateString(a.date),
      comment: a.comment,
      startTime: a.startTime,
      endTime: a.endTime,
      userName: a.user.name,
      hasKey: a.user.hasKey,
    })),
    // 個別指定 ＞ 祝日 ＞ 曜日ルール の優先順位でマージした有効な会社カレンダー
    companyDays: mergeCompanyDays({
      start: startStr,
      end: endStr,
      companyDays: companyDays.map((c) => ({
        date: toDateString(c.date),
        type: c.type,
        label: c.label,
      })),
      holidays: listHolidaysInRange(startStr, endStr),
      weekdayRules,
    }),
  };
}

export type AttendanceActionResult = {
  error?: string;
};

// 自分の出社予定を登録（既存なら内容更新 = upsert で重複を防ぐ）
export async function registerAttendance(
  dateStr: string,
  comment: string,
  startTime: string | null,
  endTime: string | null,
): Promise<AttendanceActionResult> {
  const session = await requireAuth();

  const date = parseDateString(dateStr);
  if (!date) {
    return { error: "不正な日付です" };
  }

  const trimmed = comment.trim();
  const commentError = validateComment(trimmed);
  if (commentError) {
    return { error: commentError };
  }

  // 空文字は「指定なし」として null に正規化
  const start = startTime || null;
  const end = endTime || null;
  const timeError = validateTimeRange(start, end);
  if (timeError) {
    return { error: timeError };
  }

  const data = {
    comment: trimmed === "" ? null : trimmed,
    startTime: start,
    endTime: end,
  };
  await prisma.attendanceDay.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    create: { userId: session.user.id, date, ...data },
    update: data,
  });

  return {};
}

// 自分の出社予定を取消（未登録の場合は何もしない）
export async function cancelAttendance(
  dateStr: string,
): Promise<AttendanceActionResult> {
  const session = await requireAuth();

  const date = parseDateString(dateStr);
  if (!date) {
    return { error: "不正な日付です" };
  }

  await prisma.attendanceDay.deleteMany({
    where: { userId: session.user.id, date },
  });

  return {};
}
