import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  type AdminUserDetailResponse,
  deleteAdminUser,
  fetchAdminUser,
  patchAdminUser,
} from "../../lib/admin";
import { Avatar, timeAgo } from "./AdminOverview";

const PLAN_OPTIONS = ["free", "pro", "premium"] as const;
type Plan = (typeof PLAN_OPTIONS)[number];

export function UserSlideOver({
  userId,
  onClose,
  onUpdated,
}: {
  userId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");

  useEffect(() => {
    fetchAdminUser(userId)
      .then((d) => {
        setData(d);
        setPlan((d.user.subscriptionPlan as Plan) ?? "free");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, [userId]);

  async function savePlan() {
    setBusy(true);
    try {
      await patchAdminUser(userId, { subscriptionPlan: plan });
      const fresh = await fetchAdminUser(userId);
      setData(fresh);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function softDelete() {
    if (!confirm("Soft-delete this account? They will lose access immediately.")) return;
    setBusy(true);
    try {
      await deleteAdminUser(userId);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  // Streak calendar — last 30 days. We don't have per-day signal; mark today
  // and the past `streakDays-1` days (capped at 30) as active.
  function streakDays(): boolean[] {
    if (!data) return [];
    const days: boolean[] = new Array(30).fill(false);
    const active = Math.min(30, data.user.streakDays);
    for (let i = 0; i < active; i++) {
      days[29 - i] = true;
    }
    return days;
  }

  // XP by day for the last 7 days. Approximated from totalXp / streakDays
  // with mild jitter — a placeholder until we expose a daily XP series.
  function xpDaily(): number[] {
    if (!data) return [];
    const days = 7;
    const avg = Math.max(0, Math.round(data.user.totalXp / Math.max(1, data.user.streakDays || 14)));
    return new Array(days).fill(0).map((_, i) => Math.max(0, Math.round(avg * (0.7 + ((i + 1) * 0.05)))));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-white shadow-lift">
        <div className="flex shrink-0 items-center justify-between border-b border-surface-2 px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Learner profile</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-3 hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        )}

        {data && (
          <div className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <Avatar name={data.user.fullName ?? data.user.email} size={56} />
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-semibold">
                  {data.user.fullName ?? "—"}
                </div>
                <div className="truncate text-sm font-light text-ink-3">
                  {data.user.email}
                  {data.user.phone ? ` · ${data.user.phone}` : ""}
                </div>
                <div className="mt-1 text-xs font-light text-ink-3">
                  Joined {new Date(data.user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="pill-teal">
                {data.user.nativeLang.toUpperCase()} → {data.user.targetLang.toUpperCase()}
              </span>
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-3">
                Role · {data.user.role}
              </span>
            </div>

            {/* CEFR level progress */}
            <div className="card">
              <div className="card-label">CEFR level</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold">{data.user.cefrLevel}</span>
                <span className="text-xs font-light text-ink-3">
                  {data.user.dailyMinutes} min/day goal
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width:
                      data.user.cefrLevel === "A1"
                        ? "20%"
                        : data.user.cefrLevel === "A2"
                          ? "40%"
                          : "65%",
                    background: "linear-gradient(90deg, var(--gold), var(--gold-light))",
                  }}
                />
              </div>
            </div>

            {/* Streak calendar */}
            <div className="card">
              <div className="card-label">Streak · last 30 days</div>
              <div className="mt-3 grid grid-cols-10 gap-1.5">
                {streakDays().map((on, i) => (
                  <span
                    key={i}
                    className={`h-5 w-5 rounded-md ${on ? "" : "bg-surface-2"}`}
                    style={
                      on
                        ? { background: "linear-gradient(135deg, #FF6B35, #FF8C5A)" }
                        : undefined
                    }
                    title={on ? "Active" : "Inactive"}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs font-medium text-ink-3">
                Current streak: {data.user.streakDays} days
              </div>
            </div>

            {/* XP last 7 days */}
            <div className="card">
              <div className="card-label">XP · last 7 days</div>
              <div className="mt-3 flex h-20 items-end gap-2">
                {xpDaily().map((v, i) => {
                  const max = Math.max(...xpDaily(), 1);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-md"
                      style={{
                        height: `${(v / max) * 100}%`,
                        background: "var(--gold)",
                      }}
                      title={`${v} XP`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 text-xs font-medium text-ink-3">
                Total: {data.user.totalXp.toLocaleString()} XP
              </div>
            </div>

            {/* Subscription */}
            <div className="card">
              <div className="card-label">Subscription</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-xl font-bold capitalize">
                  {data.user.subscriptionPlan}
                </span>
                <span className="text-xs font-medium text-ink-3 capitalize">
                  · {data.user.subscriptionStatus}
                </span>
              </div>
              {data.user.subscriptionEndsAt && (
                <div className="mt-1 text-xs font-light text-ink-3">
                  Renews {new Date(data.user.subscriptionEndsAt).toLocaleDateString()}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Plan)}
                  className="flex-1 rounded-2xl border border-surface-3 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-ink-3"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p[0].toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <button onClick={savePlan} disabled={busy} className="btn-primary">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>

            {/* Recent reviews */}
            {data.recentReviews.length > 0 && (
              <div className="card">
                <div className="card-label">Recent reviews · {data.recentReviews.length}</div>
                <ul className="mt-3 divide-y divide-surface-2">
                  {data.recentReviews.slice(0, 6).map((r) => (
                    <li
                      key={`${r.id}-${r.lastReviewedAt}`}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{r.tgt}</div>
                        <div className="truncate text-xs font-light text-ink-3">
                          {r.src}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-ink-3">
                        {r.lastReviewedAt ? timeAgo(r.lastReviewedAt) : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Danger zone */}
            <div className="card">
              <div className="card-label text-coral/80">Danger zone</div>
              <p className="mt-2 text-sm font-light text-ink-3">
                Soft-delete sets <code className="font-mono text-xs">deleted_at</code>{" "}
                on the user row; this hides them from the dashboard and revokes
                their access.
              </p>
              <button onClick={softDelete} disabled={busy} className="btn-danger mt-3">
                Soft delete account
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
