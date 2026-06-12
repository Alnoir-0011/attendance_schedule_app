// 交通費サマリ・上限接近アラートの純粋ロジック

// 上限接近アラートの閾値（暫定 80%。CLAUDE.md の決定事項）
export const TRANSPORT_ALERT_THRESHOLD = 0.8;

// 当月の想定交通費 = 出社登録日数 × 1日あたり交通費
export function calcMonthlyCost(
  attendanceCount: number,
  dailyTransportCost: number,
): number {
  return attendanceCount * dailyTransportCost;
}

// 上限接近アラートを表示すべきか。
// - transportCostLimit が未設定（0 以下）のユーザーは判定対象外
// - 閾値「超」で表示（80% ちょうどでは表示しない）
export function shouldShowLimitAlert(
  monthlyCost: number,
  transportCostLimit: number,
): boolean {
  if (transportCostLimit <= 0) return false;
  // 金額は整数円のみを前提とするため limit * 0.8 の浮動小数点誤差は実用上発生しない
  return monthlyCost > transportCostLimit * TRANSPORT_ALERT_THRESHOLD;
}

// JST 基準の「当月」の範囲を @db.Date 比較用の Date（UTC 0時）で返す。
// start は当月1日（含む）、end は翌月1日（含まない）
export function jstMonthRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = jst.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}
