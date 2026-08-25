import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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

  const steps = [
    { step: 1, channel: "email", delay_days: 0 },
    { step: 2, channel: "email", delay_days: 3 },
    { step: 3, channel: "email", delay_days: 7 },
  ];

  const created: any[] = [];
  let dbOk = false;

  for (const s of steps) {
    const scheduled = new Date();
    scheduled.setDate(scheduled.getDate() + s.delay_days);

    const { rows, db } = await query(
      `INSERT INTO chase_sequences (invoice_id, step, channel, scheduled_at, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, invoice_id, step, channel, scheduled_at, status, created_at`,
      [invoice_id, s.step, s.channel, scheduled.toISOString()]
    );
    dbOk = db;
    if (db && rows[0]) created.push(rows[0]);
    else {
      created.push({
        id: `mem-${s.step}-${Date.now()}`,
        invoice_id,
        step: s.step,
        channel: s.channel,
        scheduled_at: scheduled.toISOString(),
        status: "pending",
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
