import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { sendOtp, verifyOtp } from "../lib/auth";
import { Field, PasswordField, SplitAuthLayout } from "./RegisterPage";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      navigate(isOnboarded() ? "/home" : "/onboarding", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SplitAuthLayout side="login">
      <div className="w-full max-w-[440px]">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
          Pick up your streak where you left off.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={submitting}
            show={showPw}
            onToggle={() => setShowPw((v) => !v)}
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

          {formError && (
            <div
              className="rounded-2xl px-4 py-3 text-sm font-medium"
              style={{ background: "rgba(255,107,107,0.1)", color: "var(--coral)" }}
            >
              {formError}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-gold w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[2px] text-ink-3 opacity-60">
            Or
          </span>
          <div className="h-px flex-1 bg-surface-3" />
        </div>

        <OtpBlock />

        <p className="mt-6 text-center text-sm font-light text-ink-3">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-gold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </SplitAuthLayout>
  );
}

// ─── OTP block (verification only, no token issued yet) ──────────────────
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
        Or sign in with OTP
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
            We sent a 6-digit code to{" "}
            <span className="font-medium text-ink">{identifier}</span>. Enter
            it below to verify.
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
