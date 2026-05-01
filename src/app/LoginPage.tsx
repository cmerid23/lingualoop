import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { sendOtp, verifyOtp } from "../lib/auth";

type Tab = "signin" | "register";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [tab, setTab] = useState<Tab>("signin");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Register fields
  const [rgFullName, setRgFullName] = useState("");
  const [rgEmail, setRgEmail] = useState("");
  const [rgPassword, setRgPassword] = useState("");
  const [rgPhone, setRgPhone] = useState("");

  function clearErrors() {
    setErrors({});
    setFormError(null);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    const next: Record<string, string> = {};
    if (!EMAIL_RX.test(siEmail)) next.siEmail = "Enter a valid email address.";
    if (siPassword.length < 1) next.siPassword = "Password is required.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await login(siEmail.trim().toLowerCase(), siPassword);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    const next: Record<string, string> = {};
    if (rgFullName.trim().length < 1) next.rgFullName = "Tell us your name.";
    if (!EMAIL_RX.test(rgEmail)) next.rgEmail = "Enter a valid email address.";
    if (rgPassword.length < 8)
      next.rgPassword = "Password must be at least 8 characters.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await register(
        rgEmail.trim().toLowerCase(),
        rgPassword,
        rgFullName.trim(),
        rgPhone.trim() || undefined,
      );
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-surface text-ink"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 30% 50%, rgba(200,151,58,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(46,196,182,0.06) 0%, transparent 60%)",
      }}
    >
      {/* Slim ink sidebar — logo only, no nav (user isn't authenticated) */}
      <aside className="hidden lg:flex w-[88px] flex-col items-center bg-ink py-7">
        <Link
          to="/login"
          aria-label="LinguaLoop"
          className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
        >
          LL
        </Link>
      </aside>

      {/* Main column */}
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[480px] rounded-[32px] border border-surface-2 bg-white p-10 shadow-lift">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
              style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
            >
              LL
            </div>
          </div>

          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
            {tab === "signin"
              ? "Pick up your streak where you left off."
              : "Start learning in any of 6 languages, free."}
          </p>

          {/* Tabs */}
          <div
            className="mt-6 flex rounded-full p-1"
            style={{ background: "var(--surface-2)" }}
          >
            <TabButton active={tab === "signin"} onClick={() => { setTab("signin"); clearErrors(); }}>
              Sign in
            </TabButton>
            <TabButton active={tab === "register"} onClick={() => { setTab("register"); clearErrors(); }}>
              Create account
            </TabButton>
          </div>

          {/* Forms */}
          <div className="mt-7">
            {tab === "signin" ? (
              <form onSubmit={handleSignIn} noValidate>
                <Field
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={siEmail}
                  onChange={setSiEmail}
                  error={errors.siEmail}
                  disabled={submitting}
                />
                <Field
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={siPassword}
                  onChange={setSiPassword}
                  error={errors.siPassword}
                  disabled={submitting}
                  rightLink={
                    <button
                      type="button"
                      onClick={() => alert("Password reset is coming soon.")}
                      className="text-xs font-medium text-gold hover:underline"
                    >
                      Forgot password?
                    </button>
                  }
                />
                {formError && <FormError text={formError} />}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary mt-2 w-full"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate>
                <Field
                  label="Full name"
                  autoComplete="name"
                  value={rgFullName}
                  onChange={setRgFullName}
                  error={errors.rgFullName}
                  disabled={submitting}
                />
                <Field
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={rgEmail}
                  onChange={setRgEmail}
                  error={errors.rgEmail}
                  disabled={submitting}
                />
                <Field
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  value={rgPassword}
                  onChange={setRgPassword}
                  error={errors.rgPassword}
                  hint="Minimum 8 characters."
                  disabled={submitting}
                />
                <Field
                  label="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  value={rgPhone}
                  onChange={setRgPhone}
                  error={errors.rgPhone}
                  disabled={submitting}
                />
                {formError && <FormError text={formError} />}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary mt-2 w-full"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign up"}
                </button>
              </form>
            )}
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-3" />
            <span className="text-[11px] font-semibold uppercase tracking-[2px] text-ink-3 opacity-60">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-surface-3" />
          </div>

          {/* OTP flow */}
          <OtpBlock />
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────────────────────────────────────
function TabButton({
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
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
        active ? "bg-white text-ink shadow-soft" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────────────────────
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

function Field({
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
    <div className="mb-4">
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

function FormError({ text }: { text: string }) {
  return (
    <div
      className="mb-3 rounded-2xl px-4 py-3 text-sm font-medium"
      style={{ background: "rgba(255,107,107,0.1)", color: "var(--coral)" }}
    >
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP block — placeholder flow. The backend currently issues a "verified"
// receipt; password sign-in is still required for full session creation.
// ─────────────────────────────────────────────────────────────────────────────
type OtpStage = "input" | "code" | "done";

function OtpBlock() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<OtpStage>("input");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isPhone = /^[+\d\s-]+$/.test(identifier) && /\d/.test(identifier);
  const type: "email" | "phone" = isPhone ? "phone" : "email";

  async function send() {
    setErr(null);
    if (identifier.trim().length === 0) {
      setErr("Enter a phone number or email.");
      return;
    }
    setBusy(true);
    try {
      await sendOtp(identifier.trim(), type);
      setStage("code");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setErr(null);
    if (code.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(identifier.trim(), code);
      setStage("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full"
      >
        Or continue with OTP
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-surface-2 bg-surface p-4">
      {stage === "input" && (
        <>
          <Field
            label={isPhone ? "Phone number" : "Email or phone"}
            value={identifier}
            onChange={setIdentifier}
            disabled={busy}
            error={err ?? undefined}
          />
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="btn-teal w-full"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
          </button>
        </>
      )}

      {stage === "code" && (
        <>
          <p className="text-xs font-light text-ink-3">
            We sent a 6-digit code to <span className="font-medium text-ink">{identifier}</span>.
            Enter it below to verify.
          </p>
          <Field
            label="6-digit code"
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            disabled={busy}
            error={err ?? undefined}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStage("input")}
              disabled={busy}
              className="btn-ghost"
            >
              Back
            </button>
            <button
              type="button"
              onClick={verify}
              disabled={busy}
              className="btn-teal flex-1"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
            </button>
          </div>
        </>
      )}

      {stage === "done" && (
        <div
          className="rounded-2xl px-4 py-4 text-sm font-medium"
          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
        >
          ✓ Verified. Sign in with your password to continue —
          full passwordless login is rolling out soon.
        </div>
      )}
    </div>
  );
}
