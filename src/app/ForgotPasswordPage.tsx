import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Field, SplitAuthLayout } from "./RegisterPage";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EMAIL_RX.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // The endpoint always returns success to avoid email enumeration; we
      // mirror that here.
      if (!res.ok && res.status !== 429) {
        throw new Error(`${res.status}`);
      }
      if (res.status === 429) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { message?: string } | null)?.message ??
            "Too many requests. Try again later.",
        );
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SplitAuthLayout side="login">
      <div className="w-full max-w-[440px]">
        <Link
          to="/login"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
          Reset your password
        </h1>
        <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
          Enter your account email and we'll send you a link to choose a new
          password.
        </p>

        {done ? (
          <div
            className="mt-7 rounded-2xl px-4 py-4 text-sm font-medium"
            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
          >
            ✓ Check your email for a reset link. In development mode the link
            is logged to the server console.
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              error={error ?? undefined}
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-gold w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm font-light text-ink-3">
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </SplitAuthLayout>
  );
}
