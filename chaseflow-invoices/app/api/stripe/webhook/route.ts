import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { constructWebhookEvent, getPaidInvoiceId } from "@/lib/stripe";

/**
 * POST /api/stripe/webhook — Stripe webhook receiver.
 * Verifies the signature when STRIPE_WEBHOOK_SECRET is set.
 * checkout.session.completed flips the invoice status to paid.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  let event: any;
  try {
    event = await constructWebhookEvent(raw, req.headers.get("stripe-signature"));
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid webhook payload or signature" },
      { status: 400 }
    );
  }

  const invoiceId = getPaidInvoiceId(event);
  if (!invoiceId) {
    return NextResponse.json({ received: true });
  }

  const { rows, db } = await query(
    `UPDATE invoices SET status = 'paid' WHERE id = $1 AND status <> 'paid' RETURNING id`,
    [invoiceId]
  );

  return NextResponse.json({
    ok: true,
    invoice_id: invoiceId,
    updated: db ? rows.length : 0,
    source: db ? "db" : "memory",
  });
}
