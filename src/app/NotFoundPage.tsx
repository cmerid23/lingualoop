import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{
        background: "var(--ink)",
        color: "white",
        fontFamily: "Sora, sans-serif",
      }}
    >
      <div
        className="font-display text-[120px] font-bold leading-none tracking-tighter"
        style={{ color: "var(--gold-light)" }}
      >
        404
      </div>
      <h1 className="mt-2 font-display text-[32px] font-bold leading-tight tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-[15px] font-light text-white/60">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-ink transition hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
          boxShadow: "0 6px 24px rgba(200,151,58,0.4)",
        }}
      >
        Back to home
      </Link>
    </div>
  );
}
