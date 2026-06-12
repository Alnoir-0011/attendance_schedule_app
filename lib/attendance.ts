// 出社予定・会社カレンダーの純粋ロジック（Server Action と UI の双方から使用）

export const COMMENT_MAX_LENGTH = 100;

export type AttendanceItem = {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  comment: string | null;
  startTime: string | null; // HH:mm（30分刻み）
  endTime: string | null; // HH:mm（30分刻み）
  userName: string;
  hasKey: boolean;
};

export type CompanyDayItem = {
  date: string; // YYYY-MM-DD
  type: "OFFICE_DAY" | "HOLIDAY";
  label: string | null;
};

// FullCalendar の EventInput に渡す形（依存を増やさないため自前定義）
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  display?: "background";
  backgroundColor?: string;
  borderColor?: string;
  classNames?: string[];
  extendedProps?: Record<string, unknown>;
};

export function validateComment(comment: string): string | null {
  if (comment.length > COMMENT_MAX_LENGTH) {
    return `コメントは${COMMENT_MAX_LENGTH}文字以内で入力してください`;
  }
  return null;
}

// 30分刻みの "HH:mm"（00:00〜23:30）
const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

// 出社・退社時刻の検証（各々任意。両方指定時は 出社 < 退社）
export function validateTimeRange(
  startTime: string | null,
  endTime: string | null,
): string | null {
  for (const time of [startTime, endTime]) {
    if (time !== null && !TIME_PATTERN.test(time)) {
      return "時刻は30分刻み（HH:mm）で指定してください";
    }
  }
  // TIME_PATTERN 検証済みの "HH:mm"（ゼロ埋め固定長）同士なら辞書順比較で大小関係が正しく判定できる
  if (startTime !== null && endTime !== null && startTime >= endTime) {
    return "退社時刻は出社時刻より後にしてください";
  }
  return null;
}

// "09:00" → "9:00"（表示用に先頭ゼロを除く）
function formatTime(time: string): string {
  return time.startsWith("0") ? time.slice(1) : time;
}

// 時間帯の表示文字列（"9:00〜17:00" / "10:00〜" / "〜17:00" / ""）
export function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
): string {
  if (startTime === null && endTime === null) return "";
  const start = startTime ? formatTime(startTime) : "";
  const end = endTime ? formatTime(endTime) : "";
  return `${start}〜${end}`;
}

// セレクトの選択肢（00:00〜23:30 の30分刻み）
export function timeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of ["00", "30"]) {
      options.push(`${String(hour).padStart(2, "0")}:${minute}`);
    }
  }
  return options;
}

// 鍵所持者が出社する日（YYYY-MM-DD）の一覧（重複なし）
export function keyHolderDates(attendances: AttendanceItem[]): string[] {
  return [...new Set(attendances.filter((a) => a.hasKey).map((a) => a.date))];
}

// "YYYY-MM-DD" → "YYYY年M月D日"
export function formatDateJa(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

// 出社予定・会社カレンダーを FullCalendar のイベントに変換する
export function toCalendarEvents(
  attendances: AttendanceItem[],
  companyDays: CompanyDayItem[],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const day of companyDays) {
    const isHoliday = day.type === "HOLIDAY";
    // 背景色（休日: 赤系 / 出社日: 緑系）
    events.push({
      id: `company-bg-${day.date}`,
      title: "",
      date: day.date,
      display: "background",
      backgroundColor: isHoliday ? "#fecaca" : "#bbf7d0",
    });
    // ラベル
    events.push({
      id: `company-label-${day.date}`,
      title: day.label ?? (isHoliday ? "休日" : "出社日"),
      date: day.date,
      backgroundColor: isHoliday ? "#dc2626" : "#16a34a",
      borderColor: isHoliday ? "#dc2626" : "#16a34a",
    });
  }

  // 鍵所持者が出社する日のバッジ
  for (const date of keyHolderDates(attendances)) {
    events.push({
      id: `key-${date}`,
      title: "🔑 鍵あり",
      date,
      backgroundColor: "#ca8a04",
      borderColor: "#ca8a04",
    });
  }

  // 出社者（時間帯・コメント付きはタイトルに含めて表示）
  for (const attendance of attendances) {
    const timeRange = formatTimeRange(attendance.startTime, attendance.endTime);
    const name = timeRange
      ? `${timeRange} ${attendance.userName}`
      : attendance.userName;
    events.push({
      id: attendance.id,
      title: attendance.comment ? `${name}: ${attendance.comment}` : name,
      date: attendance.date,
      extendedProps: { userId: attendance.userId },
    });
  }

  return events;
}
