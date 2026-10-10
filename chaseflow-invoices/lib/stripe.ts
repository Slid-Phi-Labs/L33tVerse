/**
 * Stripe helper stubs for ChaseFlow (test-mode).
 * Replace with real Stripe SDK calls when keys are live.
 */

export type StripeStatus = {
  mode: 'test' | 'live' | 'unconfigured';
  hasKey: boolean;
  message: string;
};

export function getStripeStatus(): StripeStatus {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) {
    return { mode: 'unconfigured', hasKey: false, message: 'STRIPE_SECRET_KEY not set' };
  }
  if (key.startsWith('sk_test')) {
    return { mode: 'test', hasKey: true, message: 'Stripe test mode ready' };
  }
  if (key.startsWith('sk_live')) {
    return { mode: 'live', hasKey: true, message: 'Stripe live mode' };
  }
  return { mode: 'unconfigured', hasKey: false, message: 'Unrecognized Stripe key format' };
}

export async function createPaymentLinkStub(invoiceId: string, amountCents: number) {
  // Placeholder until real Stripe Payment Links or Checkout Sessions are wired
  return {
    id: `plink_stub_${invoiceId.slice(0, 8)}`,
    url: `https://checkout.stripe.com/stub/${invoiceId}`,
    amount_cents: amountCents,
    status: 'stub',
  };
}
