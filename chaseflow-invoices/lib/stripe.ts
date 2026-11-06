/**
 * Stripe helpers for ChaseFlow: real Checkout Sessions (env-gated key,
 * injectable adapter so tests stay offline). Without a key and without an
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

export type CheckoutSessionInput = {
  invoiceId: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  metadata: { invoice_id: string };
};

export type CheckoutSession = {
  id: string;
  url: string;
  /** live = real key used · test = injected adapter or test key · stub = no key, offline placeholder */
  mode: 'live' | 'test' | 'stub';
};

/**
 * Injectable Stripe adapter. Production code uses defaultAdapter()
 * (real SDK, env-gated); tests inject a fake — no network either way.
 */
export type CheckoutAdapter = {
  createSession(input: CheckoutSessionInput): Promise<{ id: string; url: string }>;
};

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export function buildCheckoutParams(inv: {
  id: string;
  amount_cents: number;
  currency?: string | null;
}): CheckoutSessionInput {
  const base = baseUrl();
  return {
    invoiceId: inv.id,
    amountCents: inv.amount_cents,
    currency: (inv.currency || 'usd').toLowerCase(),
    successUrl: `${base}/?checkout=success&invoice_id=${encodeURIComponent(inv.id)}`,
    cancelUrl: `${base}/?checkout=cancelled&invoice_id=${encodeURIComponent(inv.id)}`,
    metadata: { invoice_id: inv.id },
  };
}

function keyMode(): 'live' | 'test' | null {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (key.startsWith('sk_live')) return 'live';
  if (key.startsWith('sk_test')) return 'test';
  return null;
}

function defaultAdapter(): CheckoutAdapter | null {
  if (!keyMode()) return null;
  const secretKey = process.env.STRIPE_SECRET_KEY as string;
  return {
    createSession: async (input) => {
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(secretKey);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: input.currency,
              product_data: { name: `Invoice ${input.invoiceId}` },
              unit_amount: input.amountCents,
            },
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.invoiceId,
        metadata: input.metadata,
      });
      if (!session.url) throw new Error('stripe session missing url');
      return { id: session.id, url: session.url };
    },
  };
}

export async function createInvoiceCheckoutSession(
  inv: { id: string; amount_cents: number; currency?: string | null },
  adapter?: CheckoutAdapter
): Promise<CheckoutSession> {
  const params = buildCheckoutParams(inv);
  const effective = adapter ?? defaultAdapter();
  if (!effective) {
    // No key, no adapter: clearly-marked offline placeholder, never a real charge.
    return {
      id: `cs_stub_${inv.id.slice(0, 8)}`,
      url: `https://checkout.stripe.com/stub/${inv.id}`,
      mode: 'stub',
    };
  }
  const session = await effective.createSession(params);
  return { id: session.id, url: session.url, mode: keyMode() ?? 'test' };
}

/**
 * Build the Stripe event for the webhook route. Verifies the signature
 * when STRIPE_WEBHOOK_SECRET is set; otherwise parses the raw JSON body
 * (local dev / tests only — never deploy without the secret).
 */
export async function constructWebhookEvent(rawBody: string, signature?: string | null): Promise<any> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (!secret) return JSON.parse(rawBody);
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  return stripe.webhooks.constructEvent(rawBody, signature || '', secret);
}

/**
 * Extract the invoice id paid by a checkout.session.completed event.
 * Returns null for any other event type or when no id is present.
 */
export function getPaidInvoiceId(event: any): string | null {
  if (!event || event.type !== 'checkout.session.completed') return null;
  const session = event.data?.object ?? {};
  const id = session.metadata?.invoice_id ?? session.client_reference_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
