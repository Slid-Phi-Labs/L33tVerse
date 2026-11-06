import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { validateInvoiceInput, buildMemoryInvoice } from "@/lib/invoices";
import { checkPlan, freeInvoiceLimit } from "@/lib/plan";

/**
 * Plan gate for invoice creation: pro/admin are unlimited; free
 * workspaces are capped at FREE_INVOICE_LIMIT open+chasing invoices.
 * Unknown workspaces (or no DB) never block — permissive by design.
 */
async function planGate(workspace_id: string): Promise<{ allowed: boolean; reason?: string }> {
  const ws = await query(
    `SELECT u.plan FROM workspaces w JOIN users u ON u.id = w.owner_id WHERE w.id = $1`,
    [workspace_id]
  );
  if (!ws.db || ws.rows.length === 0) return { allowed: true };
  const plan = ws.rows[0]?.plan;
  if (plan === "pro" || plan === "admin") return { allowed: true };
  const open = await query(
    `SELECT COUNT(*)::int AS n FROM invoices
     WHERE workspace_id = $1 AND status IN ('open', 'chasing')`,
    [workspace_id]
  );
  const openCount = open.db && open.rows[0] ? Number(open.rows[0].n) : 0;
  return checkPlan({ plan, openCount, limit: freeInvoiceLimit() });
}

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

  const valid = validateInvoiceInput(body);
  if (!valid.ok) {
    return NextResponse.json({ ok: false, error: valid.error }, { status: 400 });
  }

  const gate = await planGate(workspace_id);
  if (!gate.allowed) {
    return NextResponse.json(
      { ok: false, error: gate.reason, code: "plan_limit" },
      { status: 402 }
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
      invoice: buildMemoryInvoice(body),
    });
  }

  return NextResponse.json({ ok: true, source: "db", invoice: rows[0] });
}
