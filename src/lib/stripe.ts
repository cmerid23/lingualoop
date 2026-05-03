import { apiFetch } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type Plan = "free" | "pro" | "premium";
export type BillingCycle = "monthly" | "annual";

/**
 * Kick off Stripe Checkout. The backend resolves the plan + cycle to a
 * Stripe price ID using its server-side env config so the frontend never
 * sees the Stripe price IDs directly. Throws on backend error; otherwise
 * navigates to the hosted Checkout page.
 */
export async function createCheckoutSession(
  plan: Exclude<Plan, "free">,
  billingCycle: BillingCycle,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/stripe/create-checkout-session`, {
    method: "POST",
    body: JSON.stringify({ plan, billingCycle }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(body?.message ?? body?.error ?? `Checkout failed (${res.status})`);
  }
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}

/** Open the Stripe-hosted billing portal for managing/cancelling. */
export async function openBillingPortal(): Promise<void> {
  const res = await apiFetch(`${API_BASE}/api/stripe/create-portal-session`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    throw new Error(body?.message ?? body?.error ?? `Portal failed (${res.status})`);
  }
  const { url } = (await res.json()) as { url: string };
  window.location.href = url;
}

export interface StripeSubscription {
  plan: Plan;
  status: string;
  billingCycle: BillingCycle | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function fetchSubscription(): Promise<StripeSubscription> {
  const res = await apiFetch(`${API_BASE}/api/stripe/subscription`);
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return (await res.json()) as StripeSubscription;
}
