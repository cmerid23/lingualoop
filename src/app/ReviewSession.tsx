import { useNavigate } from "react-router-dom";
import { Repeat } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";

export function ReviewSession() {
  const navigate = useNavigate();
  return (
    <AppShell title="Review">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "rgba(46,196,182,0.1)", color: "var(--teal-dark)" }}
        >
          <Repeat className="h-7 w-7" />
        </div>
        <h2 className="font-display text-[28px] font-bold leading-tight">
          Review session
        </h2>
        <p className="max-w-md text-[15px] font-light text-ink-3">
          A dedicated SRS review screen is coming. For now, complete a lesson —
          its cards are added to your review queue automatically.
        </p>
        <button onClick={() => navigate("/home")} className="btn-primary mt-2">
          Back to dashboard
        </button>
      </div>
    </AppShell>
  );
}
