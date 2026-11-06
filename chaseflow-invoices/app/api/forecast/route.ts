import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { summarizeInvoices } from "@/lib/forecast";

/** GET /api/forecast?workspace_id= — cash-flow from outstanding invoices */
export async function GET(req: NextRequest) {
  const workspace_id = new URL(req.url).searchParams.get("workspace_id");
  if (!workspace_id) {
    return NextResponse.json({ ok: false, error: "workspace_id required" }, { status: 400 });
  }

  const { rows, db } = await query(
    `SELECT amount_cents, status FROM invoices WHERE workspace_id = $1`,
    [workspace_id]
  );

  const summary = summarizeInvoices(db ? rows : []);

  return NextResponse.json({
    workspace_id,
    ...summary,
    source: db ? "db" : "placeholder",
  });
}
