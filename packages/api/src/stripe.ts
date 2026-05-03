import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY ?? "";

/**
 * Stripe SDK client. Pinned to a specific API version so future Stripe
 * upgrades don't break the integration silently.
 *
 * If STRIPE_SECRET_KEY is unset (e.g. Railway env not configured yet),
 * the client still instantiates but every API call fails with a clear
 * error — the server still boots, only Stripe routes are degraded.
 */
// Pinned to the API version the installed SDK was generated against. Bump
// here in lockstep with `stripe` package upgrades; the SDK type system
// will surface mismatches at typecheck time.
export const stripe = new Stripe(SECRET, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
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
