/**
 * Invoice creation logic (dependency-free, offline-testable).
 * Route handlers in app/api/invoices/route.ts use these so the
 * same validation/shape is covered by npm test.
 */

export type InvoiceInput = {
  workspace_id?: unknown;
  client_id?: unknown;
  amount_cents?: unknown;
  currency?: unknown;
  due_date?: unknown;
  payment_link?: unknown;
};

export type MemoryInvoice = {
  id: string;
  workspace_id: unknown;
  client_id: unknown;
  amount_cents: unknown;
  currency: string;
  status: "open";
  due_date: unknown;
  payment_link: unknown;
  created_at: string;
};

export function validateInvoiceInput(body: unknown): { ok: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "workspace_id and amount_cents required" };
  }
  const { workspace_id, amount_cents } = body as InvoiceInput;
  if (!workspace_id || amount_cents == null) {
    return { ok: false, error: "workspace_id and amount_cents required" };
  }
  return { ok: true };
}

export function buildMemoryInvoice(body: InvoiceInput): MemoryInvoice {
  return {
    id: "mem-" + Date.now(),
    workspace_id: body.workspace_id,
    client_id: body.client_id,
    amount_cents: body.amount_cents,
    currency: typeof body.currency === "string" ? body.currency : "usd",
    status: "open",
    due_date: body.due_date,
    payment_link: body.payment_link,
    created_at: new Date().toISOString(),
  };
}
