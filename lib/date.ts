// "YYYY-MM-DD" 文字列と @db.Date（UTC 0時の Date）の相互変換・JST 基準の日付ユーティリティ

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// "YYYY-MM-DD" を @db.Date と同じ意味（UTC 0時）の Date に変換する
export function parseDateString(dateStr: string): Date | null {
  if (!DATE_PATTERN.test(dateStr)) return null;
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  // "2026-02-30" → 3月2日 のような繰り上がりを弾く（往復で一致することを確認）
  if (toDateString(date) !== dateStr) return null;
  return date;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// JST 基準の今日の年月を返す（国内利用前提。CLAUDE.md の日付方針）
export function jstYearMonth(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 };
}
