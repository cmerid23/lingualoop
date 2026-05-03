import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

/**
 * Lazy-initialised Stripe SDK client. The Stripe constructor throws on an
 * empty key, so eager init at module load would crash the entire API on
 * any deploy that hasn't set STRIPE_SECRET_KEY yet. Routes call getStripe()
 * after passing the stripeIsConfigured() guard, so the throw only ever
 * surfaces inside a request handler — which then 503s gracefully.
 */
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!SECRET) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  _stripe = new Stripe(SECRET, {
    // Pinned to the API version the installed SDK was generated against.
    // Bump in lockstep with the `stripe` package; typecheck surfaces drift.
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return _stripe;
}

/**
 * Proxy that defers SDK instantiation until the first property access.
 * Lets routes keep using `stripe.checkout.sessions.create(...)` etc. without
 * sprinkling `getStripe()` calls everywhere.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? "",
  premium_annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID ?? "",
} as const;

/**
 * Reverse lookup from a Stripe price ID to our plan tier. Built at module
 * init so we don't recompute per webhook event. Empty IDs are skipped so
 * unset env vars don't accidentally collapse multiple keys.
 */
export const PLAN_FROM_PRICE: Record<string, "pro" | "premium"> = (() => {
  const map: Record<string, "pro" | "premium"> = {};
  if (STRIPE_PRICES.pro_monthly) map[STRIPE_PRICES.pro_monthly] = "pro";
  if (STRIPE_PRICES.pro_annual) map[STRIPE_PRICES.pro_annual] = "pro";
  if (STRIPE_PRICES.premium_monthly) map[STRIPE_PRICES.premium_monthly] = "premium";
  if (STRIPE_PRICES.premium_annual) map[STRIPE_PRICES.premium_annual] = "premium";
  return map;
})();

/** Resolve a (plan, billingCycle) into a configured Stripe price ID. */
export function priceIdFor(
  plan: "pro" | "premium",
  cycle: "monthly" | "annual",
): string | null {
  const key = `${plan}_${cycle}` as keyof typeof STRIPE_PRICES;
  const id = STRIPE_PRICES[key];
  return id && id.length > 0 ? id : null;
}

/** Detect billing cycle from a Stripe price ID. */
export function cycleFromPrice(priceId: string): "monthly" | "annual" | null {
  if (priceId === STRIPE_PRICES.pro_monthly || priceId === STRIPE_PRICES.premium_monthly) {
    return "monthly";
  }
  if (priceId === STRIPE_PRICES.pro_annual || priceId === STRIPE_PRICES.premium_annual) {
    return "annual";
  }
  return null;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** True iff Stripe is fully configured. Routes can use this to short-circuit. */
export function stripeIsConfigured(): boolean {
  return Boolean(
    SECRET &&
      STRIPE_WEBHOOK_SECRET &&
      (STRIPE_PRICES.pro_monthly ||
        STRIPE_PRICES.pro_annual ||
        STRIPE_PRICES.premium_monthly ||
        STRIPE_PRICES.premium_annual),
  );
}
