import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PasswordField, SplitAuthLayout } from "./RegisterPage";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <SplitAuthLayout side="login">
        <div className="w-full max-w-[440px]">
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight">
            Missing reset token
          </h1>
          <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
            This link is incomplete. Request a new one from the forgot-password
            page.
          </p>
          <Link to="/forgot-password" className="btn-gold mt-6 inline-block">
            Request a new link
          </Link>
        </div>
      </SplitAuthLayout>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const next: Record<string, string> = {};
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `${res.status}`);
      }
      navigate("/login?reset=ok", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SplitAuthLayout side="login">
      <div className="w-full max-w-[440px]">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-tight">
          Choose a new password
        </h1>
        <p className="mt-2 text-[15px] font-light leading-relaxed text-ink-3">
          Pick something at least 8 characters long. You'll be signed in after
          you save.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            disabled={submitting}
            show={showPw}
            onToggle={() => setShowPw((v) => !v)}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
            disabled={submitting}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save new password"}
          </button>
        </form>
      </div>
    </SplitAuthLayout>
  );
}
