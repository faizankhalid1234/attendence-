export type DayStatus = "complete" | "pending" | "absent" | "fake";

export type HistoryRow = {
  date: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  isFake?: boolean;
};

function normDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Build chart rows from member history; `localToday` is the company calendar anchor (YYYY-MM-DD). */
export function buildMemberDaySeries(
  history: HistoryRow[],
  localToday: string | undefined,
  windowDays: number,
): { day: string; full: string; status: DayStatus; statusValue: number }[] {
  if (!localToday) return [];
  const anchor = new Date(`${normDate(localToday)}T12:00:00`);
  const dates: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const x = new Date(anchor);
    x.setDate(x.getDate() - i);
    dates.push(x.toISOString().slice(0, 10));
  }
  const map = new Map<string, HistoryRow>();
  for (const r of history) {
    map.set(normDate(r.date), r);
  }
  return dates.map((full) => {
    const row = map.get(full);
    let status: DayStatus = "absent";
    if (row?.isFake) status = "fake";
    else if (row?.checkedInAt && row.checkedOutAt) status = "complete";
    else if (row?.checkedInAt) status = "pending";
    const statusValue = status === "complete" ? 4 : status === "pending" ? 3 : status === "fake" ? 2 : 1;
    return { day: full.slice(5), full, status, statusValue };
  });
}

export function summarizeSeries(rows: { status: DayStatus }[]) {
  return rows.reduce(
    (a, r) => {
      a[r.status] += 1;
      return a;
    },
    { complete: 0, pending: 0, absent: 0, fake: 0 },
  );
}

/** One chart row for a single calendar day (member detail modal). */
export function buildSingleDayChartRow(
  dateYmd: string,
  row: HistoryRow | undefined,
): { day: string; full: string; status: DayStatus; statusValue: number }[] {
  let status: DayStatus = "absent";
  if (row?.isFake) status = "fake";
  else if (row?.checkedInAt && row.checkedOutAt) status = "complete";
  else if (row?.checkedInAt) status = "pending";
  const statusValue = status === "complete" ? 4 : status === "pending" ? 3 : status === "fake" ? 2 : 1;
  return [{ day: dateYmd.slice(8), full: dateYmd, status, statusValue }];
}

/** All YYYY-MM-DD strings in the same calendar month as `anchorYmd` (inclusive), ascending. */
export function datesInMonthOf(anchorYmd: string): string[] {
  const y = Number(anchorYmd.slice(0, 4));
  const m = Number(anchorYmd.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return [];
  const count = new Date(y, m, 0).getDate();
  const prefix = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
  return Array.from({ length: count }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`);
}
