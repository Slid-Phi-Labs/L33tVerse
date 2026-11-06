import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { buildChaseSchedule } from "@/lib/chase";

/**
 * POST /api/chase — start a simple 3-step chase sequence for an invoice
 * Steps: day 0 email, day 3 email, day 7 email (configurable later)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { invoice_id } = body;

  if (!invoice_id) {
    return NextResponse.json({ ok: false, error: "invoice_id required" }, { status: 400 });
  }

  const schedule = buildChaseSchedule(invoice_id);

  const created: any[] = [];
  let dbOk = false;

  for (const s of schedule) {
    const { rows, db } = await query(
      `INSERT INTO chase_sequences (invoice_id, step, channel, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, invoice_id, step, channel, scheduled_at, status, created_at`,
      [invoice_id, s.step, s.channel, s.scheduled_at]
    );
    dbOk = db;
    if (db && rows[0]) created.push(rows[0]);
    else {
      created.push({
        id: `mem-${s.step}-${Date.now()}`,
        ...s,
      });
    }
  }

  // Mark invoice as chasing if DB available
  if (dbOk) {
    await query(`UPDATE invoices SET status = 'chasing' WHERE id = $1 AND status = 'open'`, [
      invoice_id,
    ]);
  }

  return NextResponse.json({
    ok: true,
    source: dbOk ? "db" : "memory",
    sequence: created,
    count: created.length,
  });
}

/** GET /api/chase?invoice_id= — list chase steps for an invoice */
export async function GET(req: NextRequest) {
  const invoice_id = new URL(req.url).searchParams.get("invoice_id");
  if (!invoice_id) {
    return NextResponse.json({ ok: false, error: "invoice_id required" }, { status: 400 });
  }

  const { rows, db } = await query(
    `SELECT id, invoice_id, step, channel, scheduled_at, sent_at, status, created_at
     FROM chase_sequences
     WHERE invoice_id = $1
     ORDER BY step ASC`,
    [invoice_id]
  );

  return NextResponse.json({
    sequences: db ? rows : [],
    count: db ? rows.length : 0,
    source: db ? "db" : "placeholder",
  });
}
