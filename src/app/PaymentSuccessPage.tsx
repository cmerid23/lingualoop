import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Sparkles, ArrowRight } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { Confetti } from "../components/ui/Confetti";
import { useAuthStore } from "../store/authStore";

const PLAN_FEATURES: Record<"pro" | "premium", string[]> = {
  pro: [
    "All 6 languages + 30 pairs",
    "Unlimited lessons",
    "AI tutor up to 250 messages/day",
  ],
  premium: [
    "Everything in Pro",
    "Unlimited AI tutor",
    "Priority support + early access",
  ],
};

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 6; // ~9 seconds

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const user = useAuthStore((s) => s.user);
  const loadFromToken = useAuthStore((s) => s.loadFromToken);
  const [polling, setPolling] = useState(true);

  // Poll /api/auth/me until the user's plan flips off "free" (webhook fired)
  // or we run out of attempts. Either way we render a celebration.
  useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      await loadFromToken();
      attempts += 1;
      const fresh = useAuthStore.getState().user;
      if (fresh?.subscriptionPlan === "pro" || fresh?.subscriptionPlan === "premium") {
        setPolling(false);
        return;
      }
      if (attempts >= POLL_MAX_ATTEMPTS) {
        setPolling(false);
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }
    tick();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loadFromToken]);

  const plan = (user?.subscriptionPlan ?? "free") as "free" | "pro" | "premium";
  const planLabel = plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : "your new plan";

  const features = useMemo<string[]>(() => {
    if (plan === "pro" || plan === "premium") return PLAN_FEATURES[plan];
    return [];
  }, [plan]);

  return (
    <AppShell bare>
      {!polling && plan !== "free" && <Confetti count={56} />}
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(200,151,58,0.1) 0%, transparent 70%)",
        }}
      >
        <div
          className="mb-7 flex h-[120px] w-[120px] items-center justify-center rounded-[36px] border-2 animate-bounce-in"
          style={{
            background: "linear-gradient(135deg, var(--gold-pale), #FFF8E7)",
            borderColor: "rgba(200,151,58,0.2)",
            boxShadow: "0 12px 40px rgba(200,151,58,0.2)",
          }}
        >
          <Trophy className="h-14 w-14 text-gold" />
        </div>

        <h1 className="font-display text-[40px] font-bold leading-tight tracking-tight">
          {plan === "free"
            ? "Thanks for subscribing!"
            : `Welcome to ${planLabel}! 🎉`}
        </h1>
        <p className="mt-3 max-w-md text-base font-light text-ink-3">
          {plan === "free"
            ? "Your account is being upgraded. This usually takes a few seconds — refresh in a moment if you don't see the change."
            : "Your account has been upgraded. All limits are now unlocked."}
        </p>

        {features.length > 0 && (
          <ul className="mt-9 space-y-2.5 text-left">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[15px] font-medium">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-gold"
                  style={{ background: "var(--gold-pale)" }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        )}

        <Link
          to="/home"
          className="btn-gold mt-10 inline-flex items-center gap-2"
        >
          Start learning
          <ArrowRight className="h-4 w-4" />
        </Link>

        {sessionId && (
          <p className="mt-6 text-[10px] font-light text-ink-3/60">
            Receipt id: {sessionId.slice(0, 24)}…
          </p>
        )}
      </div>
    </AppShell>
  );
}
