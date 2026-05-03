import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function PaymentCancelPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      <div className="text-[64px]">🛒</div>
      <h1 className="mt-2 font-display text-[34px] font-bold leading-tight tracking-tight">
        Payment cancelled
      </h1>
      <p className="mt-3 max-w-md text-[15px] font-light text-ink-3">
        No charge was made. You can try again whenever you're ready.
      </p>
      <Link
        to="/pricing"
        className="btn-gold mt-8 inline-flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pricing
      </Link>
    </div>
  );
}
