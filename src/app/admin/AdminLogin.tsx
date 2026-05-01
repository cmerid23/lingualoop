import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const next: Record<string, string> = {};
    if (!EMAIL_RX.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 1) next.password = "Password is required.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // The auth store now has the user — routes guard handles role check.
      navigate("/admin", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen bg-surface text-ink"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(200,151,58,0.06) 0%, transparent 60%)",
      }}
    >
      <aside className="hidden lg:flex w-[88px] flex-col items-center bg-ink py-7">
        <Link
          to="/admin/login"
          aria-label="LinguaLoop"
          className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
        >
          LL
        </Link>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[440px] rounded-[32px] border border-surface-2 bg-white p-10 shadow-lift">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
              style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
            >
              LL
            </div>
          </div>

          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-violet">
            <Lock className="h-3 w-3" />
            Restricted access
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight">
            Admin Portal
          </h1>
          <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
            Sign in with an admin account to view the operator dashboard.
            Activity is logged.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-7">
            <Field
              label="Admin email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              disabled={submitting}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              disabled={submitting}
            />

            {formError && (
              <div
                className="mb-3 rounded-2xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(255,107,107,0.1)", color: "var(--coral)" }}
              >
                {formError}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in to admin"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-light text-ink-3">
            Looking for the learner app?{" "}
            <Link to="/login" className="font-medium text-gold hover:underline">
              Go to user sign in →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  error,
  disabled,
}: FieldProps) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-medium text-ink-3">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition focus:bg-white ${
          error ? "border-coral focus:border-coral" : "border-surface-3 focus:border-ink-3"
        }`}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}
