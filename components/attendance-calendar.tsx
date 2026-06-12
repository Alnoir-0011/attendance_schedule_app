"use client";

import jaLocale from "@fullcalendar/core/locales/ja";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelAttendance,
  getCalendarData,
  registerAttendance,
} from "@/lib/actions/attendance";
import {
  COMMENT_MAX_LENGTH,
  formatDateJa,
  formatTimeRange,
  timeOptions,
  toCalendarEvents,
  type AttendanceItem,
  type CompanyDayItem,
} from "@/lib/attendance";

const TIME_OPTIONS = timeOptions();

// 30分刻みの時刻セレクト（空文字 = 指定なし）
// 48択 × 2 の単純な選択肢のため、shadcn の Select ではなく軽量なネイティブ select を意図的に使用
function TimeSelect({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="border-input bg-background h-9 rounded-md border px-2 text-sm"
      >
        <option value="">指定なし</option>
        {TIME_OPTIONS.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </div>
  );
}

type Props = {
  currentUserId: string;
};

export function AttendanceCalendar({ currentUserId }: Props) {
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [companyDays, setCompanyDays] = useState<CompanyDayItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // 登録・取消後の再取得用に、現在表示中の範囲を保持する
  // （reload は「いま表示している範囲」を取り直す意図のため、月移動後はその月を再取得する）
  const rangeRef = useRef<{ start: string; end: string } | null>(null);

  const events = useMemo(
    () => toCalendarEvents(attendances, companyDays),
    [attendances, companyDays],
  );

  const loadRange = (start: string, end: string) => {
    rangeRef.current = { start, end };
    startTransition(async () => {
      try {
        const data = await getCalendarData(start, end);
        setAttendances(data.attendances);
        setCompanyDays(data.companyDays);
        setLoadError(null);
      } catch {
        // Server Action のエラーをそのまま投げるとページごとクラッシュするため表示に変換する
        setLoadError(
          "予定の取得に失敗しました。時間をおいて再読み込みしてください。",
        );
      }
    });
  };

  const reload = () => {
    if (rangeRef.current) {
      loadRange(rangeRef.current.start, rangeRef.current.end);
    }
  };

  const openDay = (dateStr: string) => {
    const mine = attendances.find(
      (a) => a.userId === currentUserId && a.date === dateStr,
    );
    setComment(mine?.comment ?? "");
    setStartTime(mine?.startTime ?? "");
    setEndTime(mine?.endTime ?? "");
    setError(null);
    setSelectedDate(dateStr);
  };

  const selectedAttendances = selectedDate
    ? attendances.filter((a) => a.date === selectedDate)
    : [];
  const myAttendance = selectedAttendances.find(
    (a) => a.userId === currentUserId,
  );
  const selectedCompanyDay = selectedDate
    ? companyDays.find((c) => c.date === selectedDate)
    : undefined;
  const isHoliday = selectedCompanyDay?.type === "HOLIDAY";

  const handleRegister = () => {
    if (!selectedDate) return;
    startTransition(async () => {
      const result = await registerAttendance(
        selectedDate,
        comment,
        startTime || null,
        endTime || null,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelectedDate(null);
      reload();
    });
  };

  const handleCancel = () => {
    if (!selectedDate) return;
    startTransition(async () => {
      const result = await cancelAttendance(selectedDate);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelectedDate(null);
      reload();
    });
  };

  return (
    <>
      {loadError && (
        <p
          role="alert"
          className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {loadError}
        </p>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={jaLocale}
        events={events}
        // 初期表示・月移動時に表示範囲のデータを取得する
        datesSet={(arg) =>
          loadRange(arg.startStr.slice(0, 10), arg.endStr.slice(0, 10))
        }
        dateClick={(arg) => openDay(arg.dateStr)}
        eventClick={(arg) => {
          const dateStr = arg.event.startStr.slice(0, 10);
          if (dateStr) openDay(dateStr);
        }}
        height="auto"
      />

      <Dialog
        open={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? formatDateJa(selectedDate) : ""} の出社予定
            </DialogTitle>
            <DialogDescription>
              自分の出社予定の登録・取消ができます
            </DialogDescription>
          </DialogHeader>

          {isHoliday && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              この日は休日です
              {selectedCompanyDay?.label
                ? `（${selectedCompanyDay.label}）`
                : ""}
              。出社登録は可能です。
            </p>
          )}

          {selectedAttendances.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">出社予定者</p>
              <ul className="flex flex-col gap-0.5">
                {selectedAttendances.map((a) => {
                  const timeRange = formatTimeRange(a.startTime, a.endTime);
                  return (
                    <li key={a.id} className="text-muted-foreground text-sm">
                      {a.hasKey ? "🔑 " : ""}
                      {a.userName}
                      {timeRange ? `（${timeRange}）` : ""}
                      {a.comment ? `: ${a.comment}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <TimeSelect
              id="attendance-start-time"
              label="出社時刻（任意）"
              value={startTime}
              onChange={setStartTime}
              disabled={isPending}
            />
            <TimeSelect
              id="attendance-end-time"
              label="退社時刻（任意）"
              value={endTime}
              onChange={setEndTime}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attendance-comment">
              一言コメント（任意・{COMMENT_MAX_LENGTH}文字まで）
            </Label>
            <Textarea
              id="attendance-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              disabled={isPending}
            />
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            {myAttendance && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                出社を取り消す
              </Button>
            )}
            <Button onClick={handleRegister} disabled={isPending}>
              {myAttendance ? "コメントを更新する" : "出社する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
