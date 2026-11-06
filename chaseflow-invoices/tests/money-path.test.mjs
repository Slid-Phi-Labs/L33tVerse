/**
 * Money-path tests for ChaseFlow Invoices (fully offline).
 * Covers create / chase / pay / forecast plus the invoice plan gate.
 * Run: npm test   (node --test tests/)
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";

import { validateInvoiceInput, buildMemoryInvoice } from "../lib/invoices.ts";
import { buildChaseSchedule, CHASE_STEPS } from "../lib/chase.ts";
import { summarizeInvoices } from "../lib/forecast.ts";
import { checkPlan, normalizePlan, freeInvoiceLimit } from "../lib/plan.ts";
import {
  getStripeStatus,
  buildCheckoutParams,
  createInvoiceCheckoutSession,
  constructWebhookEvent,
  getPaidInvoiceId,
} from "../lib/stripe.ts";

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
});

describe("create — POST /api/invoices validation + shape", () => {
  it("accepts a complete invoice body", () => {
    const r = validateInvoiceInput({ workspace_id: "ws-1", amount_cents: 5000 });
    assert.equal(r.ok, true);
  });

  it("rejects missing workspace_id / amount_cents with the API error", () => {
    for (const body of [{}, { workspace_id: "ws-1" }, { amount_cents: 100 }, null]) {
      const r = validateInvoiceInput(body);
      assert.equal(r.ok, false);
      assert.equal(r.error, "workspace_id and amount_cents required");
    }
  });

  it("memory invoice opens with usd default", () => {
    const inv = buildMemoryInvoice({ workspace_id: "ws-1", amount_cents: 2500 });
    assert.equal(inv.status, "open");
    assert.equal(inv.currency, "usd");
    assert.equal(inv.workspace_id, "ws-1");
    assert.equal(inv.amount_cents, 2500);
    assert.match(inv.id, /^mem-/);
  });
});

describe("chase — POST /api/chase 3-step schedule", () => {
  it("defines day 0 / 3 / 7 email steps", () => {
    assert.deepEqual(CHASE_STEPS, [
      { step: 1, channel: "email", delay_days: 0 },
      { step: 2, channel: "email", delay_days: 3 },
      { step: 3, channel: "email", delay_days: 7 },
    ]);
  });

  it("schedules pending steps at the right offsets", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const sched = buildChaseSchedule("inv-1", now);
    assert.equal(sched.length, 3);
    const days = sched.map((s) => (Date.parse(s.scheduled_at) - now) / 86400000);
    assert.deepEqual(days, [0, 3, 7]);
    for (const s of sched) {
      assert.equal(s.invoice_id, "inv-1");
      assert.equal(s.channel, "email");
      assert.equal(s.status, "pending");
    }
    assert.deepEqual(sched.map((s) => s.step), [1, 2, 3]);
  });
});

describe("pay — real Checkout Sessions + webhook", () => {
  it("reports unconfigured stripe without a key", () => {
    delete process.env.STRIPE_SECRET_KEY;
    const s = getStripeStatus();
    assert.equal(s.mode, "unconfigured");
    assert.equal(s.hasKey, false);
  });

  it("builds checkout params carrying the invoice id", () => {
    const p = buildCheckoutParams({ id: "inv-9", amount_cents: 1200, currency: "USD" });
    assert.equal(p.invoiceId, "inv-9");
    assert.equal(p.amountCents, 1200);
    assert.equal(p.currency, "usd");
    assert.equal(p.metadata.invoice_id, "inv-9");
    assert.ok(p.successUrl.includes("inv-9"));
    assert.ok(p.cancelUrl.includes("inv-9"));
  });

  it("falls back to a marked stub with no key and no adapter", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const s = await createInvoiceCheckoutSession({ id: "inv-9", amount_cents: 1200 });
    assert.equal(s.mode, "stub");
    assert.ok(s.url.includes("inv-9"));
  });

  it("uses the injected adapter offline (no network)", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    let seen = null;
    const fake = {
      createSession: async (input) => {
        seen = input;
        return { id: "cs_test_123", url: "https://checkout.stripe.com/pay/cs_test_123" };
      },
    };
    const s = await createInvoiceCheckoutSession(
      { id: "inv-9", amount_cents: 1200, currency: "usd" },
      fake
    );
    assert.equal(s.id, "cs_test_123");
    assert.equal(s.url, "https://checkout.stripe.com/pay/cs_test_123");
    assert.equal(seen.invoiceId, "inv-9");
    assert.equal(seen.amountCents, 1200);
    assert.equal(seen.metadata.invoice_id, "inv-9");
  });

  it("parses the webhook body directly without a webhook secret", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const raw = JSON.stringify({ type: "checkout.session.completed", data: { object: {} } });
    const event = await constructWebhookEvent(raw, null);
    assert.equal(event.type, "checkout.session.completed");
  });

  it("extracts the paid invoice from checkout.session.completed", () => {
    const completed = {
      type: "checkout.session.completed",
      data: { object: { metadata: { invoice_id: "inv-9" }, client_reference_id: "inv-9" } },
    };
    assert.equal(getPaidInvoiceId(completed), "inv-9");
  });

  it("falls back to client_reference_id when metadata is absent", () => {
    const e = {
      type: "checkout.session.completed",
      data: { object: { client_reference_id: "inv-7" } },
    };
    assert.equal(getPaidInvoiceId(e), "inv-7");
  });

  it("ignores other event types and empty payloads", () => {
    assert.equal(getPaidInvoiceId({ type: "charge.refunded", data: {} }), null);
    assert.equal(
      getPaidInvoiceId({ type: "checkout.session.completed", data: { object: {} } }),
      null
    );
    assert.equal(getPaidInvoiceId(null), null);
  });
});

describe("forecast — GET /api/forecast summary", () => {
  it("splits outstanding vs paid like the SQL FILTERs did", () => {
    const rows = [
      { amount_cents: 1000, status: "open" },
      { amount_cents: "2000", status: "chasing" },
      { amount_cents: 500, status: "paid" },
      { amount_cents: 999, status: "draft" },
    ];
    assert.deepEqual(summarizeInvoices(rows), {
      outstanding_cents: 3000,
      paid_cents: 500,
      open_count: 2,
      paid_count: 1,
    });
  });

  it("returns zeros for no invoices", () => {
    assert.deepEqual(summarizeInvoices([]), {
      outstanding_cents: 0,
      paid_cents: 0,
      open_count: 0,
      paid_count: 0,
    });
  });
});

describe("plan — POST /api/invoices gate", () => {
  it("lets pro and admin through regardless of count", () => {
    assert.equal(checkPlan({ plan: "pro", openCount: 999, limit: 2 }).allowed, true);
    assert.equal(checkPlan({ plan: "admin", openCount: 999, limit: 2 }).allowed, true);
  });

  it("caps free workspaces at the limit", () => {
    assert.equal(checkPlan({ plan: "free", openCount: 1, limit: 2 }).allowed, true);
    const over = checkPlan({ plan: "free", openCount: 2, limit: 2 });
    assert.equal(over.allowed, false);
    assert.match(over.reason ?? "", /free plan limit/);
  });

  it("treats unknown plans as free (safe default)", () => {
    assert.equal(normalizePlan("enterprise"), "free");
    assert.equal(normalizePlan(undefined), "free");
    assert.equal(checkPlan({ plan: "enterprise", openCount: 99, limit: 5 }).allowed, false);
  });

  it("reads FREE_INVOICE_LIMIT with a sane default", () => {
    delete process.env.FREE_INVOICE_LIMIT;
    assert.equal(freeInvoiceLimit(), 10);
    process.env.FREE_INVOICE_LIMIT = "3";
    assert.equal(freeInvoiceLimit(), 3);
    process.env.FREE_INVOICE_LIMIT = "bogus";
    assert.equal(freeInvoiceLimit(), 10);
  });
});
