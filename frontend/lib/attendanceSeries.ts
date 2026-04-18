export type DayStatus = "complete" | "pending" | "absent";

export type HistoryRow = {
  date: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
};

function normDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Member history se chart rows — `localToday` company calendar anchor (YYYY-MM-DD). */
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
    if (row?.checkedInAt && row.checkedOutAt) status = "complete";
    else if (row?.checkedInAt) status = "pending";
    const statusValue = status === "complete" ? 3 : status === "pending" ? 2 : 1;
    return { day: full.slice(5), full, status, statusValue };
  });
}

export function summarizeSeries(rows: { status: DayStatus }[]) {
  return rows.reduce(
    (a, r) => {
      a[r.status] += 1;
      return a;
    },
    { complete: 0, pending: 0, absent: 0 },
  );
}
