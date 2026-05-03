import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Sparkles, BookOpen, Globe } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const next: Record<string, string> = {};
    if (fullName.trim().length < 1) next.fullName = "Tell us your name.";
    if (!EMAIL_RX.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await register(
        email.trim().toLowerCase(),
        password,
        fullName.trim(),
        phone.trim() || undefined,
      );
      // Fresh registration always lands on onboarding.
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SplitAuthLayout side="register">
      <div className="w-full max-w-[440px]">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
          Start learning today. Free forever, no card needed.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
          <Field
            label="Full name"
            autoComplete="name"
            value={fullName}
            onChange={setFullName}
            error={errors.fullName}
            disabled={submitting}
          />
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            disabled={submitting}
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={submitting}
            show={showPw}
            onToggle={() => setShowPw((v) => !v)}
            hint="At least 8 characters."
          />
          <Field
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            disabled={submitting}
          />

          {formError && (
            <div
              className="rounded-2xl px-4 py-3 text-sm font-medium"
              style={{ background: "rgba(255,107,107,0.1)", color: "var(--coral)" }}
            >
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-gold w-full"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-light text-ink-3">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-gold hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-6 text-center text-[11px] font-light text-ink-3 leading-relaxed">
          By creating an account, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </SplitAuthLayout>
  );
}

// ─── Shared layout for register/login pages ──────────────────────────────
export function SplitAuthLayout({
  side,
  children,
}: {
  side: "register" | "login";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      {/* Left: dark panel */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12 text-white"
        style={{ background: "var(--ink)" }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72"
          style={{
            background:
              "radial-gradient(circle, rgba(200,151,58,0.18) 0%, transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72"
          style={{
            background:
              "radial-gradient(circle, rgba(46,196,182,0.15) 0%, transparent 70%)",
          }}
        />

        <Link to="/" className="relative inline-flex items-center gap-2.5 self-start">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl font-display text-base font-bold tracking-tighter text-ink"
            style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
          >
            LL
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            LinguaLoop
          </span>
        </Link>

        <div className="relative">
          <p className="font-display text-[28px] font-semibold leading-snug tracking-tight">
            {side === "register"
              ? "“Learning a language is the closest you can get to time travel.”"
              : "“The limits of my language mean the limits of my world.”"}
          </p>
          <p className="mt-3 text-sm font-light text-white/50">
            {side === "register" ? "— anonymous polyglot" : "— Ludwig Wittgenstein"}
          </p>
        </div>

        <ul className="relative space-y-3 text-sm font-light text-white/70">
          <Bullet icon={<Globe className="h-4 w-4 text-gold" />}>
            6 languages, every direction — including Amharic, Tigrinya, and Arabic
          </Bullet>
          <Bullet icon={<Sparkles className="h-4 w-4 text-gold" />}>
            AI-generated lessons tailored to your CEFR level
          </Bullet>
          <Bullet icon={<BookOpen className="h-4 w-4 text-gold" />}>
            Picture associations, sound recognition, pronunciation drills, sentence builders
          </Bullet>
        </ul>
      </aside>

      {/* Right: form */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12">
        {/* Mobile logo */}
        <div className="absolute left-0 right-0 top-0 flex justify-center bg-ink py-5 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-base font-bold tracking-tighter text-ink"
              style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
            >
              LL
            </span>
            <span className="font-display text-base font-semibold tracking-tight text-white">
              LinguaLoop
            </span>
          </Link>
        </div>
        <div className="mt-16 w-full max-w-[440px] lg:mt-0">{children}</div>
      </main>
    </div>
  );
}

function Bullet({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5">
        {icon}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  rightLink?: React.ReactNode;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  hint,
  disabled,
  rightLink,
}: FieldProps) {
  const showError = Boolean(error);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-medium text-ink-3">{label}</label>
        {rightLink}
      </div>
      <input
        type={type}
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition focus:bg-white ${
          showError
            ? "border-coral focus:border-coral"
            : "border-surface-3 focus:border-ink-3"
        }`}
      />
      {showError ? (
        <p className="mt-1.5 text-xs font-medium text-coral">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs font-light text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

interface PasswordFieldProps extends Omit<FieldProps, "type"> {
  show: boolean;
  onToggle: () => void;
}

export function PasswordField({
  show,
  onToggle,
  ...rest
}: PasswordFieldProps) {
  return (
    <div className="relative">
      <Field {...rest} type={show ? "text" : "password"} />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-4 top-9 text-ink-3 hover:text-ink"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
