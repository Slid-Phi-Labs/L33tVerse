import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/** GET /api/forecast?workspace_id= — cash-flow from outstanding invoices */
export async function GET(req: NextRequest) {
  const workspace_id = new URL(req.url).searchParams.get("workspace_id");
  if (!workspace_id) {
    return NextResponse.json({ ok: false, error: "workspace_id required" }, { status: 400 });
  }

  const { rows, db } = await query(
    `SELECT
       COALESCE(SUM(amount_cents) FILTER (WHERE status IN ('open','chasing')), 0)::bigint AS outstanding_cents,
       COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0)::bigint AS paid_cents,
       COUNT(*) FILTER (WHERE status IN ('open','chasing'))::int AS open_count,
       COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count
     FROM invoices
     WHERE workspace_id = $1`,
    [workspace_id]
  );

  const r = db ? rows[0] : null;

  return NextResponse.json({
    workspace_id,
    outstanding_cents: r ? Number(r.outstanding_cents) : 0,
    paid_cents: r ? Number(r.paid_cents) : 0,
    open_count: r ? Number(r.open_count) : 0,
    paid_count: r ? Number(r.paid_count) : 0,
    source: db ? "db" : "placeholder",
  });
}
