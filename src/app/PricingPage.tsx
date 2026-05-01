import { useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useAuthStore } from "../store/authStore";

type Plan = "free" | "pro" | "premium";
type Cycle = "monthly" | "annual";

const PRICES: Record<Plan, { monthly: number; annual: number }> = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 9.99, annual: 95.9 },
  premium: { monthly: 19.99, annual: 191.9 },
};

interface FeatureRow {
  text: string;
  included: boolean;
}

const FEATURES: Record<Plan, FeatureRow[]> = {
  free: [
    { text: "1 language pair", included: true },
    { text: "5 lessons per day", included: true },
    { text: "Basic TTS", included: true },
    { text: "AI tutor", included: false },
    { text: "Pronunciation scoring", included: false },
    { text: "Offline mode", included: false },
  ],
  pro: [
    { text: "All 6 languages + 30 pairs", included: true },
    { text: "Unlimited lessons", included: true },
    { text: "Full TTS + pronunciation scoring", included: true },
    { text: "AI tutor (100 messages/day)", included: true },
    { text: "Offline mode", included: false },
    { text: "Priority support", included: false },
  ],
  premium: [
    { text: "Everything in Pro", included: true },
    { text: "Unlimited AI tutor", included: true },
    { text: "Offline mode", included: true },
    { text: "Priority support", included: true },
    { text: "Custom learning path", included: true },
    { text: "Early access to new features", included: true },
  ],
};

export function PricingPage() {
  const user = useAuthStore((s) => s.user);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const currentPlan = (user?.subscriptionPlan ?? "free") as Plan;

  function priceLabel(plan: Plan): string {
    if (plan === "free") return "$0";
    const p = PRICES[plan];
    if (cycle === "monthly") return `$${p.monthly.toFixed(2)}`;
    // Annual: show monthly equivalent
    return `$${(p.annual / 12).toFixed(2)}`;
  }

  function priceSub(plan: Plan): string {
    if (plan === "free") return "forever";
    if (cycle === "monthly") return "/ month";
    return `/ month, billed annually ($${PRICES[plan].annual.toFixed(2)})`;
  }

  function buttonLabel(plan: Plan): string {
    if (currentPlan === plan) return "Current plan";
    if (plan === "free") return "Downgrade to Free";
    if (plan === "pro") return "Upgrade to Pro";
    return "Go Premium";
  }

  function onUpgrade(plan: Plan) {
    if (plan === currentPlan) return;
    alert(
      "Payment integration is rolling out soon. To test a paid plan, ask an admin to update your subscription in the admin dashboard.",
    );
  }

  return (
    <AppShell title="Pricing">
      <div className="px-6 py-8 lg:px-9">
        {/* Hero */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="pill-gold mb-3">
            <Sparkles className="h-3 w-3" />
            Choose your tier
          </span>
          <h1 className="font-display text-[40px] font-bold leading-tight tracking-tight">
            Learn smarter, faster
          </h1>
          <p className="mt-3 text-[15px] font-light leading-relaxed text-ink-3">
            Start free. Upgrade when you're ready for unlimited lessons,
            pronunciation scoring, and the AI tutor.
          </p>

          {/* Cycle toggle */}
          <div className="mt-6 inline-flex rounded-full bg-surface-2 p-1">
            <CycleButton
              active={cycle === "monthly"}
              onClick={() => setCycle("monthly")}
            >
              Monthly
            </CycleButton>
            <CycleButton
              active={cycle === "annual"}
              onClick={() => setCycle("annual")}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">
                –20%
              </span>
            </CycleButton>
          </div>
        </div>

        {/* Cards */}
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {/* Free */}
          <PlanCard
            plan="free"
            current={currentPlan === "free"}
            tone="surface"
            title="Free"
            tagline="Get started, no card needed."
            price={priceLabel("free")}
            priceSub="forever"
            features={FEATURES.free}
            buttonLabel={buttonLabel("free")}
            onClick={() => onUpgrade("free")}
          />

          {/* Pro */}
          <PlanCard
            plan="pro"
            current={currentPlan === "pro"}
            tone="teal"
            title="Pro"
            tagline="For serious learners."
            badge="Most popular"
            price={priceLabel("pro")}
            priceSub={priceSub("pro")}
            features={FEATURES.pro}
            buttonLabel={buttonLabel("pro")}
            onClick={() => onUpgrade("pro")}
          />

          {/* Premium */}
          <PlanCard
            plan="premium"
            current={currentPlan === "premium"}
            tone="gold"
            title="Premium"
            tagline="The full experience."
            price={priceLabel("premium")}
            priceSub={priceSub("premium")}
            features={FEATURES.premium}
            buttonLabel={buttonLabel("premium")}
            onClick={() => onUpgrade("premium")}
          />
        </div>

        <p className="mt-10 text-center text-xs font-light text-ink-3">
          Plans automatically renew. Cancel anytime in Settings.
        </p>
      </div>
    </AppShell>
  );
}

// ─── Cycle toggle button ──────────────────────────────────────────────────
function CycleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center rounded-full px-5 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-ink shadow-soft" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  current,
  tone,
  title,
  tagline,
  badge,
  price,
  priceSub,
  features,
  buttonLabel,
  onClick,
}: {
  plan: Plan;
  current: boolean;
  tone: "surface" | "teal" | "gold";
  title: string;
  tagline: string;
  badge?: string;
  price: string;
  priceSub: string;
  features: FeatureRow[];
  buttonLabel: string;
  onClick: () => void;
}) {
  const isDark = tone !== "surface";
  const wrapStyle =
    tone === "teal"
      ? { background: "linear-gradient(135deg, var(--teal-dark), var(--teal))" }
      : tone === "gold"
        ? { background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }
        : undefined;

  const labelClass = isDark ? "text-white/60" : "text-ink-3";
  const titleClass = isDark
    ? tone === "teal"
      ? "text-white"
      : "text-ink"
    : "text-ink";
  const featureColor = isDark
    ? tone === "teal"
      ? "text-white"
      : "text-ink-2"
    : "text-ink";
  const mutedFeatureColor = isDark
    ? tone === "teal"
      ? "text-white/60"
      : "text-ink/50"
    : "text-ink-3 opacity-60";

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] p-7 shadow-soft ${
        tone === "surface" ? "bg-white border border-surface-2" : ""
      } ${badge ? "ring-2 ring-gold/40" : ""}`}
      style={wrapStyle}
    >
      {badge && (
        <span
          className="absolute right-5 top-5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink"
          style={{ background: "var(--gold)" }}
        >
          {badge}
        </span>
      )}

      <div className={`text-[11px] font-bold uppercase tracking-[2px] ${labelClass}`}>
        {tagline}
      </div>
      <h3 className={`mt-1 font-display text-[26px] font-bold leading-tight ${titleClass}`}>
        {title}
      </h3>

      <div className="mt-5">
        <div className={`font-display text-[44px] font-bold leading-none tracking-tight ${titleClass}`}>
          {price}
        </div>
        <div className={`mt-1.5 text-[13px] font-light ${labelClass}`}>{priceSub}</div>
      </div>

      <ul className="mt-7 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                f.included
                  ? isDark
                    ? "bg-white/20 text-white"
                    : "bg-[#22c55e]/15 text-[#22c55e]"
                  : isDark
                    ? "bg-white/10 text-white/40"
                    : "bg-surface-2 text-ink-3/50"
              }`}
            >
              {f.included ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <span
              className={`leading-relaxed ${f.included ? featureColor : mutedFeatureColor}`}
            >
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={current}
        className={`mt-7 w-full rounded-full py-3.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          current
            ? isDark
              ? "bg-white/20 text-white"
              : "bg-surface-2 text-ink-3"
            : isDark
              ? "bg-ink text-white hover:-translate-y-0.5 hover:shadow-lift"
              : "bg-ink text-white hover:-translate-y-0.5 hover:shadow-soft"
        }`}
      >
        {buttonLabel}
      </button>

      {/* Decorative glow */}
      {isDark && (
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
      )}
    </div>
  );
}
