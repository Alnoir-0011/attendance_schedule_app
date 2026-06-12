"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteCompanyDay,
  deleteWeekdayRule,
  getCompanyDays,
  getWeekdayRules,
  saveCompanyDay,
  saveWeekdayRule,
} from "@/lib/actions/admin";
import { formatDateJa, type CompanyDayItem } from "@/lib/attendance";
import { WEEKDAY_LABELS, type WeekdayRuleItem } from "@/lib/company-calendar";

type Props = {
  initialYear: number;
  initialMonth: number;
  initialDays: CompanyDayItem[];
  initialRules: WeekdayRuleItem[];
};

const TYPE_LABELS = { OFFICE_DAY: "出社日", HOLIDAY: "休日" } as const;

export function AdminCompanyCalendar({
  initialYear,
  initialMonth,
  initialDays,
  initialRules,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function moveMonth(delta: number) {
    // month は 1〜12。Date の month 引数（0始まり）に変換して繰り上がりを任せる
    const moved = new Date(Date.UTC(year, month - 1 + delta, 1));
    const nextYear = moved.getUTCFullYear();
    const nextMonth = moved.getUTCMonth() + 1;
    setIsPending(true);
    setDays(await getCompanyDays(nextYear, nextMonth));
    setIsPending(false);
    setYear(nextYear);
    setMonth(nextMonth);
  }

  async function refresh() {
    setDays(await getCompanyDays(year, month));
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsPending(true);
    const result = await saveCompanyDay({
      date: String(formData.get("date") ?? ""),
      type: String(formData.get("type") ?? ""),
      label: String(formData.get("label") ?? ""),
    });
    if (result.error) {
      setIsPending(false);
      setError(result.error);
      return;
    }
    await refresh();
    setIsPending(false);
    setError(null);
    form.reset();
  }

  async function handleDelete(date: string) {
    setIsPending(true);
    const result = await deleteCompanyDay(date);
    if (result.error) {
      setIsPending(false);
      setError(result.error);
      return;
    }
    await refresh();
    setIsPending(false);
    setError(null);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">会社カレンダー（出社日・休日）</h2>
      <p className="text-muted-foreground text-sm">
        祝日は自動で休日として表示されます。同じ日に複数の指定がある場合は
        「個別の日付指定 ＞ 祝日 ＞ 曜日ルール」の順で優先されます。
      </p>

      <h3 className="font-medium">個別の日付指定</h3>

      <form
        aria-label="個別の日付指定"
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-day-date">日付</Label>
          <Input
            id="company-day-date"
            name="date"
            type="date"
            required
            disabled={isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-day-type">種別</Label>
          {/* 2択のため shadcn の Select ではなく軽量なネイティブ select を意図的に使用 */}
          <select
            id="company-day-type"
            name="type"
            defaultValue="OFFICE_DAY"
            disabled={isPending}
            className="border-input h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="OFFICE_DAY">出社日</option>
            <option value="HOLIDAY">休日</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-day-label">ラベル（任意）</Label>
          <Input
            id="company-day-label"
            name="label"
            placeholder="全社出社日 など"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          追加する
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveMonth(-1)}
          disabled={isPending}
        >
          前月
        </Button>
        <span className="text-sm font-medium">
          {year}年{month}月
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveMonth(1)}
          disabled={isPending}
        >
          翌月
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>ラベル</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                この月の登録はありません
              </TableCell>
            </TableRow>
          ) : (
            days.map((day) => (
              <TableRow key={day.date}>
                <TableCell className="font-medium">
                  {formatDateJa(day.date)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      day.type === "HOLIDAY"
                        ? "rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                        : "rounded bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    }
                  >
                    {TYPE_LABELS[day.type]}
                  </span>
                </TableCell>
                <TableCell>{day.label ?? "－"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(day.date)}
                    disabled={isPending}
                  >
                    削除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <WeekdayRuleSection initialRules={initialRules} />
    </section>
  );
}

// 曜日ルール（毎週◯曜＝出社日/休日）の設定・削除
function WeekdayRuleSection({
  initialRules,
}: {
  initialRules: WeekdayRuleItem[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsPending(true);
    const result = await saveWeekdayRule({
      weekday: Number(formData.get("weekday") ?? -1),
      type: String(formData.get("type") ?? ""),
      label: String(formData.get("label") ?? ""),
    });
    if (result.error) {
      setIsPending(false);
      setError(result.error);
      return;
    }
    setRules(await getWeekdayRules());
    setIsPending(false);
    setError(null);
    form.reset();
  }

  async function handleDelete(weekday: number) {
    setIsPending(true);
    const result = await deleteWeekdayRule(weekday);
    if (result.error) {
      setIsPending(false);
      setError(result.error);
      return;
    }
    setRules(await getWeekdayRules());
    setIsPending(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">曜日ルール（毎週の出社日・休日）</h3>

      <form
        aria-label="曜日ルール設定"
        onSubmit={handleSave}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="weekday-rule-weekday">曜日</Label>
          <select
            id="weekday-rule-weekday"
            name="weekday"
            defaultValue="1"
            disabled={isPending}
            className="border-input h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            {WEEKDAY_LABELS.map((label, weekday) => (
              <option key={weekday} value={weekday}>
                {label}曜
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="weekday-rule-type">種別</Label>
          <select
            id="weekday-rule-type"
            name="type"
            defaultValue="OFFICE_DAY"
            disabled={isPending}
            className="border-input h-9 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          >
            <option value="OFFICE_DAY">出社日</option>
            <option value="HOLIDAY">休日</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="weekday-rule-label">ラベル（任意）</Label>
          <Input
            id="weekday-rule-label"
            name="label"
            placeholder="全社出社日 など"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          設定する
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>曜日</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>ラベル</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                曜日ルールはありません
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => (
              <TableRow key={rule.weekday}>
                <TableCell className="font-medium">
                  毎週{WEEKDAY_LABELS[rule.weekday]}曜
                </TableCell>
                <TableCell>
                  <span
                    className={
                      rule.type === "HOLIDAY"
                        ? "rounded bg-red-100 px-2 py-0.5 text-xs text-red-700"
                        : "rounded bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    }
                  >
                    {TYPE_LABELS[rule.type]}
                  </span>
                </TableCell>
                <TableCell>{rule.label ?? "－"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(rule.weekday)}
                    disabled={isPending}
                  >
                    削除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
