import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/** GET /api/invoices — list invoices for a workspace */
export async function GET(req: NextRequest) {
  const workspace_id = new URL(req.url).searchParams.get("workspace_id");
  if (!workspace_id) {
    return NextResponse.json({ ok: false, error: "workspace_id required" }, { status: 400 });
  }

  const { rows, db } = await query(
    `SELECT id, workspace_id, client_id, amount_cents, currency, status,
            due_date, payment_link, created_at
     FROM invoices
     WHERE workspace_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [workspace_id]
  );

  return NextResponse.json({
    invoices: db ? rows : [],
    count: db ? rows.length : 0,
    source: db ? "db" : "placeholder",
  });
}

/** POST /api/invoices — create invoice */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    workspace_id,
    client_id,
    amount_cents,
    currency = "usd",
    due_date,
    payment_link,
  } = body;

  if (!workspace_id || amount_cents == null) {
    return NextResponse.json(
      { ok: false, error: "workspace_id and amount_cents required" },
      { status: 400 }
    );
  }

  const { rows, db } = await query(
    `INSERT INTO invoices (workspace_id, client_id, amount_cents, currency, status, due_date, payment_link)
     VALUES ($1, $2, $3, $4, 'open', $5, $6)
     RETURNING id, workspace_id, client_id, amount_cents, currency, status, due_date, payment_link, created_at`,
    [workspace_id, client_id || null, amount_cents, currency, due_date || null, payment_link || null]
  );

  if (!db) {
    return NextResponse.json({
      ok: true,
      source: "memory",
      invoice: {
        id: "mem-" + Date.now(),
        workspace_id,
        client_id,
        amount_cents,
        currency,
        status: "open",
        due_date,
        payment_link,
        created_at: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ ok: true, source: "db", invoice: rows[0] });
}
