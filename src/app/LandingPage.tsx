import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Globe, Bot, Flame, Menu, X, Volume2 } from "lucide-react";
import { ALL_LANG_CODES, LANGUAGES, scriptClass } from "../data/languages";
import { useAuthStore } from "../store/authStore";
import { PlanCard, PLAN_FEATURES } from "./PricingPage";

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const ctaLabel = user ? "Open dashboard →" : "Start for free →";
  const ctaTo = user ? "/home" : "/register";

  return (
    <div className="bg-surface text-ink">
      <Navbar isAuthed={Boolean(user)} />
      <Hero ctaLabel={ctaLabel} ctaTo={ctaTo} />
      <LanguagesSection />
      <HowItWorksSection />
      <PricingPreviewSection />
      <FinalCta isAuthed={Boolean(user)} />
      <Footer />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────
function Navbar({ isAuthed }: { isAuthed: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-surface-2"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-base font-bold tracking-tighter text-ink"
            style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
          >
            LL
          </span>
          <span
            className={`font-display text-lg font-semibold tracking-tight ${scrolled ? "text-ink" : "text-white"}`}
          >
            LinguaLoop
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-2 md:flex">
          <Link
            to="/pricing"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${scrolled ? "text-ink-3 hover:text-ink" : "text-white/70 hover:text-white"}`}
          >
            Pricing
          </Link>
          {isAuthed ? (
            <Link to="/home" className="btn-gold">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  scrolled
                    ? "border-surface-3 text-ink hover:bg-surface-2"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >
                Log in
              </Link>
              <Link to="/register" className="btn-gold">
                Get started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Open menu"
          className={`flex h-10 w-10 items-center justify-center rounded-full md:hidden ${scrolled ? "text-ink" : "text-white"}`}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-surface-2 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            <Link to="/pricing" onClick={() => setMobileOpen(false)} className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-3 hover:bg-surface-2">
              Pricing
            </Link>
            {isAuthed ? (
              <Link to="/home" onClick={() => setMobileOpen(false)} className="btn-gold">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-3 hover:bg-surface-2">
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-gold">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero({ ctaLabel, ctaTo }: { ctaLabel: string; ctaTo: string }) {
  return (
    <section
      className="relative flex min-h-[100svh] items-center overflow-hidden text-white"
      style={{ background: "var(--ink)" }}
    >
      {/* Glow accents */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[480px] w-[480px]"
        style={{
          background:
            "radial-gradient(circle, rgba(200,151,58,0.18) 0%, transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[420px]"
        style={{
          background:
            "radial-gradient(circle, rgba(46,196,182,0.15) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-24">
        {/* Copy */}
        <div className="max-w-2xl">
          <span
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-white/60"
          >
            <span className="h-2 w-2 rounded-full bg-gold" />
            New · Arabic now live
          </span>
          <h1 className="font-display font-bold leading-[1.05] tracking-tight text-white text-[clamp(36px,6vw,64px)]">
            The smartest way to learn
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[clamp(13px,1.6vw,18px)] font-medium text-white/80">
            <LangToken>Amharic</LangToken>
            <Dot />
            <LangToken>Tigrinya</LangToken>
            <Dot />
            <LangToken>Arabic</LangToken>
            <Dot />
            <LangToken>Spanish</LangToken>
            <Dot />
            <LangToken>French</LangToken>
            <Dot />
            <LangToken>English</LangToken>
          </div>
          <p className="mt-6 text-base font-light leading-relaxed text-white/70 sm:text-lg">
            AI-powered lessons, picture memory, native pronunciation and
            spaced repetition — in 6 languages, 30 learning directions.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to={ctaTo} className="btn-gold inline-flex items-center gap-2">
              {ctaLabel}
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> 6 Languages
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" /> AI Tutor
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Streak System
            </span>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="flex justify-center lg:justify-end">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

// One language token in the row beneath the headline. Subtle hover
// brightens it to gold-light; otherwise inherits the parent's white/80.
function LangToken({ children }: { children: React.ReactNode }) {
  return (
    <span className="cursor-default transition-colors duration-200 hover:text-[var(--gold-light)]">
      {children}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden style={{ color: "var(--teal)" }} className="font-light">
      ·
    </span>
  );
}

function PhoneMockup() {
  return (
    <div
      className="relative animate-float"
      style={{
        width: 280,
        height: 580,
        borderRadius: 44,
        background: "linear-gradient(180deg, #1a1a2e, #0a0a0f)",
        padding: 8,
        boxShadow:
          "0 50px 100px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(200,151,58,0.18) inset",
      }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 top-2 h-6 w-28 -translate-x-1/2 rounded-full"
        style={{ background: "#000" }}
      />
      {/* Screen */}
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ borderRadius: 36, background: "var(--surface)" }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-7">
          <span className="text-[10px] font-semibold tracking-wider text-ink-3">9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="pill-streak text-[10px]">🔥 12</span>
          </div>
        </div>
        {/* Activity pill */}
        <div className="mt-4 flex justify-center">
          <span className="activity-pill text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--gold)" }} />
            Picture Association
          </span>
        </div>
        {/* Lesson card */}
        <div className="mt-5 flex flex-col items-center gap-4 px-5">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-3xl border-2 border-surface-2 bg-white text-5xl shadow-soft"
          >
            👋
          </div>
          <div className="text-center">
            <div className="font-display text-3xl font-bold leading-none tracking-tight text-ink">
              ሰላም
            </div>
            <div className="mt-1 text-xs font-light italic text-ink-3">selam</div>
            <div className="mt-2 text-xs font-medium text-ink-3">→ hello</div>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lift"
            style={{ background: "var(--ink)" }}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <button
            className="w-full rounded-full py-2.5 text-xs font-bold text-white"
            style={{ background: "var(--ink)" }}
          >
            Got it ✓
          </button>
        </div>
        {/* Progress dots */}
        <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-gold" />
          <span className="h-1.5 w-1.5 rounded-full bg-surface-2" />
          <span className="h-1.5 w-1.5 rounded-full bg-surface-2" />
          <span className="h-1.5 w-1.5 rounded-full bg-surface-2" />
        </div>
      </div>
    </div>
  );
}

// ─── Languages ────────────────────────────────────────────────────────────
function LanguagesSection() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="card-label">Languages</span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Learn any direction
          </h2>
          <p className="mt-4 text-[15px] font-light leading-relaxed text-ink-3">
            Six languages, every pair. Native speakers and heritage learners,
            this is built for you.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_LANG_CODES.map((code) => {
            const m = LANGUAGES[code];
            return (
              <div
                key={code}
                className="relative overflow-hidden rounded-3xl border-2 border-surface-2 bg-white p-7 transition hover:-translate-y-1 hover:border-gold hover:shadow-soft"
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, transparent 60%, rgba(200,151,58,0.05))",
                  }}
                />
                <span className="relative block text-[40px]">{m.flag}</span>
                <div className="relative mt-3.5">
                  <div className="font-display text-lg font-semibold">{m.name}</div>
                  <div className={`mt-1 text-[13px] font-light text-ink-3 ${scriptClass(code)}`}>
                    {m.nativeName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-10 text-center text-sm font-medium text-ink-3">
          30 bidirectional pairs — learn from any language to any language.
        </p>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      n: "01",
      title: "Choose your languages",
      body: "Pick the language you speak best and the one you want to learn. Switch any time.",
    },
    {
      n: "02",
      title: "Follow AI-generated lessons",
      body: "Picture associations, sound recognition, pronunciation drills, and sentence builders — all tuned to your level.",
    },
    {
      n: "03",
      title: "Practice with spaced repetition",
      body: "An SM-2 SRS engine resurfaces the words you're about to forget — the moment you're about to forget them.",
    },
  ];
  return (
    <section id="how-it-works" className="bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="card-label">How it works</span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Three steps to fluency
          </h2>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl border border-surface-2 bg-white p-7 shadow-soft"
            >
              <div className="font-display text-[60px] font-bold leading-none tracking-tight text-gold">
                {s.n}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-[14px] font-light leading-relaxed text-ink-3">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing preview ──────────────────────────────────────────────────────
function PricingPreviewSection() {
  return (
    <section
      className="relative overflow-hidden py-24 text-white"
      style={{ background: "var(--ink)" }}
    >
      <div
        className="pointer-events-none absolute -right-24 top-12 h-72 w-72"
        style={{
          background:
            "radial-gradient(circle, rgba(200,151,58,0.12) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span
            className="text-[11px] font-bold uppercase tracking-[2px] text-white/40"
          >
            Pricing
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing, serious results
          </h2>
          <p className="mt-4 text-[15px] font-light leading-relaxed text-white/70">
            Start free. Upgrade when you're ready for unlimited lessons and the
            AI tutor.
          </p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <PlanCard
            plan="free"
            current={false}
            tone="surface"
            title="Free"
            tagline="Get started, no card needed."
            price="$0"
            priceSub="forever"
            features={PLAN_FEATURES.free}
            buttonLabel="Create your free account"
            onClick={() => (window.location.href = "/register")}
          />
          <PlanCard
            plan="pro"
            current={false}
            tone="teal"
            title="Pro"
            tagline="For serious learners."
            badge="Most popular"
            price="$9.99"
            priceSub="/ month"
            features={PLAN_FEATURES.pro}
            buttonLabel="Start with Pro"
            onClick={() => (window.location.href = "/register")}
          />
          <PlanCard
            plan="premium"
            current={false}
            tone="gold"
            title="Premium"
            tagline="The full experience."
            price="$19.99"
            priceSub="/ month"
            features={PLAN_FEATURES.premium}
            buttonLabel="Go Premium"
            onClick={() => (window.location.href = "/register")}
          />
        </div>
        <p className="mt-10 text-center text-sm font-light text-white/50">
          See full plan comparison on the{" "}
          <Link to="/pricing" className="text-gold hover:underline">
            pricing page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────
function FinalCta({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section
      className="relative overflow-hidden py-24"
      style={{
        background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-[44px] font-bold leading-tight tracking-tight text-ink sm:text-[56px]">
          Ready to start?
        </h2>
        <p className="mt-4 text-[15px] font-light leading-relaxed text-ink/70">
          Join the loop. Your first lesson is one tap away.
        </p>
        <Link
          to={isAuthed ? "/home" : "/register"}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          {isAuthed ? "Open dashboard" : "Create your free account"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-ink py-10 text-white/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs font-light sm:flex-row lg:px-8">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md font-display text-xs font-bold tracking-tighter text-ink"
            style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
          >
            LL
          </span>
          <span>© {new Date().getFullYear()} LinguaLoop</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/pricing" className="hover:text-white">Pricing</Link>
          <Link to="/login" className="hover:text-white">Log in</Link>
          <Link to="/register" className="hover:text-white">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}
