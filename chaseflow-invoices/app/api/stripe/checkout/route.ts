import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createInvoiceCheckoutSession } from "@/lib/stripe";

/**
 * POST /api/stripe/checkout — create a real Stripe Checkout Session
 * for an invoice and store its URL as the invoice payment_link.
 * Body: { invoice_id }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { invoice_id } = body;

  if (!invoice_id) {
    return NextResponse.json({ ok: false, error: "invoice_id required" }, { status: 400 });
  }

  const { rows, db } = await query(
    `SELECT id, amount_cents, currency, status FROM invoices WHERE id = $1`,
    [invoice_id]
  );

  if (!db) {
    return NextResponse.json(
      { ok: false, error: "db unavailable — checkout requires a stored invoice" },
      { status: 503 }
    );
  }

  const invoice = rows[0];
  if (!invoice) {
    return NextResponse.json({ ok: false, error: "invoice not found" }, { status: 404 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ ok: false, error: "invoice already paid" }, { status: 409 });
  }

  let session;
  try {
    session = await createInvoiceCheckoutSession({
      id: invoice.id,
      amount_cents: Number(invoice.amount_cents),
      currency: invoice.currency,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "stripe checkout failed" },
      { status: 502 }
    );
  }

  await query(`UPDATE invoices SET payment_link = $1 WHERE id = $2`, [session.url, invoice.id]);

  return NextResponse.json({
    ok: true,
    invoice_id: invoice.id,
    session_id: session.id,
    url: session.url,
    mode: session.mode,
  });
}
