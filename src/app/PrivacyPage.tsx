import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { MarketingFooter, MarketingNavbar } from "./LandingPage";

const LAST_UPDATED = "May 2026";

export function PrivacyPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="bg-surface text-ink">
      <MarketingNavbar isAuthed={Boolean(user)} />

      {/* Header */}
      <section
        className="relative overflow-hidden text-white"
        style={{ background: "var(--ink)" }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72"
          style={{
            background:
              "radial-gradient(circle, rgba(46,196,182,0.18) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-32 lg:px-8">
          <span className="card-label-on-dark">Legal</span>
          <h1 className="mt-3 font-display text-[44px] font-bold leading-tight tracking-tight sm:text-[56px]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm font-light text-white/50">
            Last updated · {LAST_UPDATED}
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <div className="space-y-10 text-[15px] font-light leading-relaxed text-ink-3">
          <Section title="1. Information We Collect">
            <p>
              When you create an account we collect your email, name, and
              optionally a phone number. We also collect language-learning
              activity that you generate inside the app: completed lessons,
              streak history, XP, spaced-repetition card grades, and tutor
              conversation history.
            </p>
            <p>
              When you make a payment (future), our payment provider handles
              card details directly — we never store full card numbers on our
              servers.
            </p>
          </Section>

          <Section title="2. How We Use Information">
            <p>
              We use the information we collect to operate, maintain, and
              improve the Service: to authenticate you, render personalized
              dashboards, schedule spaced-repetition reviews, enforce daily
              usage limits, and prepare AI prompts that fit your level and
              language pair.
            </p>
            <p>
              We do not sell your personal information to third parties or use
              your private learning history to train AI models.
            </p>
          </Section>

          <Section title="3. Data Storage">
            <p>
              Your account data is stored on managed Postgres infrastructure
              hosted by Railway. Lesson content and SRS card progress are also
              cached on your device via IndexedDB so the app works offline.
              You can clear local data any time from Settings → Reset.
            </p>
            <p>
              We retain your data while your account is active. If you delete
              your account, we soft-delete it immediately and purge the
              underlying records within 30 days.
            </p>
          </Section>

          <Section title="4. Third Party Services">
            <p>
              <strong className="font-medium text-ink">Anthropic</strong> —
              We send lesson prompts and tutor messages to Anthropic's Claude
              API to generate language-learning content. The contents of those
              messages are subject to{" "}
              <a
                href="https://www.anthropic.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gold hover:underline"
              >
                Anthropic's privacy policy
              </a>
              . We do not share your account email or other identifying
              metadata with Anthropic.
            </p>
            <p>
              <strong className="font-medium text-ink">Railway</strong> — Our
              backend, database, and frontend are hosted on Railway. See their{" "}
              <a
                href="https://railway.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gold hover:underline"
              >
                privacy policy
              </a>{" "}
              for details on infrastructure-level data handling.
            </p>
            <p>
              <strong className="font-medium text-ink">Browser TTS / STT</strong> —
              Pronunciation features use the Web Speech API, which runs on the
              device and does not send audio to LinguaLoop's servers.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p>
              You have the right to access, correct, export, or delete the
              personal information we hold about you. Email{" "}
              <a
                href="mailto:hello@lingualoop.app"
                className="font-medium text-gold hover:underline"
              >
                hello@lingualoop.app
              </a>{" "}
              and we will respond within 30 days.
            </p>
            <p>
              If you are in the EU/UK, you also have the right to lodge a
              complaint with your local data protection authority.
            </p>
          </Section>

          <Section title="6. Cookies">
            <p>
              LinguaLoop uses{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                localStorage
              </code>{" "}
              to keep you signed in (a single JWT) and{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                IndexedDB
              </code>{" "}
              to cache lessons and progress. We do not use third-party
              advertising or analytics cookies.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              Questions about your privacy? Email{" "}
              <a
                href="mailto:hello@lingualoop.app"
                className="font-medium text-gold hover:underline"
              >
                hello@lingualoop.app
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-surface-2 pt-8 text-sm font-light text-ink-3">
          <Link to="/" className="font-medium text-ink hover:text-gold">
            ← Back to home
          </Link>
          <Link to="/terms" className="font-medium text-gold hover:underline">
            Terms of Service →
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-[22px] font-semibold leading-tight tracking-tight text-ink">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
