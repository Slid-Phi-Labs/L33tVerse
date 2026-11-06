/**
 * Cash-flow forecast summary (dependency-free, offline-testable).
 * Matches the previous SQL FILTER semantics: open+chasing count as
 * outstanding, paid counts as paid, every other status is ignored.
 * Route handler in app/api/forecast/route.ts uses this.
 */

export type ForecastRow = { amount_cents: unknown; status: unknown };

export type ForecastSummary = {
  outstanding_cents: number;
  paid_cents: number;
  open_count: number;
  paid_count: number;
};

export function summarizeInvoices(rows: ForecastRow[]): ForecastSummary {
  let outstanding_cents = 0;
  let paid_cents = 0;
  let open_count = 0;
  let paid_count = 0;
  for (const row of rows) {
    const amount = Number(row.amount_cents);
    const value = Number.isFinite(amount) ? amount : 0;
    if (row.status === "open" || row.status === "chasing") {
      outstanding_cents += value;
      open_count += 1;
    } else if (row.status === "paid") {
      paid_cents += value;
      paid_count += 1;
    }
  }
  return { outstanding_cents, paid_cents, open_count, paid_count };
}
