import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { MarketingFooter, MarketingNavbar } from "./LandingPage";

const LAST_UPDATED = "May 2026";

export function TermsPage() {
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
              "radial-gradient(circle, rgba(200,151,58,0.18) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 pb-16 pt-32 lg:px-8">
          <span className="card-label-on-dark">Legal</span>
          <h1 className="mt-3 font-display text-[44px] font-bold leading-tight tracking-tight sm:text-[56px]">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm font-light text-white/50">
            Last updated · {LAST_UPDATED}
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <div className="space-y-10 text-[15px] font-light leading-relaxed text-ink-3">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using LinguaLoop ("the Service"), you agree to be
              bound by these Terms of Service and our{" "}
              <Link to="/privacy" className="font-medium text-gold hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree to these terms, do not use the Service.
            </p>
            <p>
              LinguaLoop reserves the right to modify these terms at any time;
              material changes will be communicated via email or in-app notice
              with at least 14 days notice before taking effect.
            </p>
          </Section>

          <Section title="2. Use of Service">
            <p>
              LinguaLoop provides AI-assisted language-learning tools including
              vocabulary lessons, pronunciation drills, conversation practice,
              and spaced-repetition reviews across the supported language
              pairs. The Service is intended for personal, non-commercial
              educational use.
            </p>
            <p>
              You agree not to misuse the Service, including but not limited to
              attempting to disrupt, reverse-engineer, or extract proprietary
              content beyond ordinary learner consumption.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>
              You are responsible for safeguarding the password used to access
              your account and for any activity under your account. Notify us
              immediately of any unauthorized use.
            </p>
            <p>
              We may suspend or terminate accounts that violate these terms or
              exhibit abusive behavior toward other learners or our staff.
            </p>
          </Section>

          <Section title="4. Subscription and Payment">
            <p>
              Free plans are available without payment. Paid plans (Pro,
              Premium) are billed monthly or annually as selected; subscriptions
              renew automatically until cancelled. You can cancel at any time
              from Settings; cancellation takes effect at the end of the current
              billing period.
            </p>
            <p>
              All fees are non-refundable except where required by law. We may
              change pricing on future renewal terms with 30 days advance
              notice.
            </p>
          </Section>

          <Section title="5. Intellectual Property">
            <p>
              All curriculum content, lesson text, generated dialogues, audio,
              software, and visual design are the property of LinguaLoop or its
              licensors and are protected by copyright and other laws. You
              receive a limited, revocable, non-transferable license to access
              the Service for personal use only.
            </p>
          </Section>

          <Section title="6. Disclaimer of Warranties">
            <p>
              The Service is provided "as is" and "as available" without
              warranties of any kind, express or implied. We do not warrant
              that AI-generated content will be free of errors or fit for any
              particular purpose, including formal language certification.
            </p>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, LinguaLoop and its
              affiliates shall not be liable for indirect, incidental, special,
              consequential, or punitive damages arising out of your use of the
              Service. Our total liability for any claim shall not exceed the
              amount you paid us in the 12 months preceding the claim.
            </p>
          </Section>

          <Section title="8. Governing Law">
            <p>
              These terms are governed by the laws of the jurisdiction in
              which LinguaLoop is registered, without regard to conflict-of-law
              principles. Any dispute shall be resolved in the competent
              courts of that jurisdiction.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about these terms? Email{" "}
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

        {/* Footer links inside content */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-surface-2 pt-8 text-sm font-light text-ink-3">
          <Link to="/" className="font-medium text-ink hover:text-gold">
            ← Back to home
          </Link>
          <Link to="/privacy" className="font-medium text-gold hover:underline">
            Privacy Policy →
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
