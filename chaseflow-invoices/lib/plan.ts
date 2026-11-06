/**
 * Plan gating for ChaseFlow (dependency-free, offline-testable).
 *
 * Plans come from users.plan: free | pro | admin.
 * Only Stripe webhook handlers write free/pro; the admin unlock
 * route writes plan=admin (billing bypass). See blueprint/backend/02_BILLING.md.
 */

export type Plan = "free" | "pro" | "admin";

const DEFAULT_FREE_OPEN_INVOICE_LIMIT = 10;

export function normalizePlan(plan: unknown): Plan {
  if (plan === "pro" || plan === "admin") return plan;
  return "free";
}

/** Max open+chasing invoices a free workspace may hold. Env-overridable. */
export function freeInvoiceLimit(): number {
  const raw = process.env.FREE_INVOICE_LIMIT;
  const parsed = raw == null || raw === "" ? NaN : Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_FREE_OPEN_INVOICE_LIMIT;
}

export type PlanCheckInput = {
  plan: unknown;
  openCount: number;
  limit?: number;
};

export type PlanCheck = { allowed: boolean; reason?: string };

export function checkPlan(input: PlanCheckInput): PlanCheck {
  const plan = normalizePlan(input.plan);
  if (plan === "pro" || plan === "admin") return { allowed: true };
  const limit = input.limit ?? freeInvoiceLimit();
  if (input.openCount < limit) return { allowed: true };
  return {
    allowed: false,
    reason: `free plan limit reached (${limit} open invoices) — upgrade to pro`,
  };
}
