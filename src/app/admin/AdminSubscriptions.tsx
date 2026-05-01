import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  fetchAdminSubscriptions,
  type AdminSubscription,
} from "../../lib/admin";
import { Avatar } from "./AdminOverview";

const STATUS_FILTERS = [
  { v: "", label: "All" },
  { v: "active", label: "Active" },
  { v: "cancelled", label: "Cancelled" },
  { v: "expired", label: "Expired" },
];

export function AdminSubscriptions() {
  const [rows, setRows] = useState<AdminSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAdminSubscriptions({ page, limit, status: status || undefined })
      .then((r) => {
        setRows(r.subscriptions);
        setTotal(r.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [page, status, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex flex-wrap items-center gap-2">
        <span className="card-label mr-3">Filter by status</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => {
              setStatus(f.v);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              status === f.v
                ? "bg-ink text-white"
                : "bg-surface-2 text-ink-3 hover:bg-surface-3"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              <tr>
                <th className="py-3 pl-5 pr-3">User</th>
                <th className="py-3 pr-3">Plan</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3">Amount</th>
                <th className="py-3 pr-3">Started</th>
                <th className="py-3 pr-3">Ends</th>
                <th className="py-3 pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-surface-2">
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.user.fullName ?? s.user.email ?? "?"} size={32} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {s.user.fullName ?? "—"}
                        </div>
                        <div className="truncate text-xs font-light text-ink-3">
                          {s.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 capitalize">{s.plan}</td>
                  <td className="py-3 pr-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="py-3 pr-3 font-medium">
                    ${(s.amountCents / 100).toFixed(2)} {s.currency}
                  </td>
                  <td className="py-3 pr-3 text-ink-3">
                    {s.startedAt ? new Date(s.startedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-3 text-ink-3">
                    {s.endsAt ? new Date(s.endsAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-5">
                    <button className="text-xs font-semibold text-ink-3 hover:text-ink">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm font-light text-ink-3">
                    No subscriptions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        )}
        {error && (
          <div className="px-5 py-4 text-sm font-medium text-coral">{error}</div>
        )}

        <div className="flex items-center justify-between border-t border-surface-2 px-5 py-3 text-sm text-ink-3">
          <span>
            {total === 0 ? "0 results" : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-surface-3 px-3 py-1 text-xs font-semibold disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-medium text-ink">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-surface-3 px-3 py-1 text-xs font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-[#22c55e]/10 text-[#22c55e]",
    cancelled: "bg-coral/10 text-coral",
    expired: "bg-surface-2 text-ink-3",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status] ?? styles.expired}`}
    >
      {status}
    </span>
  );
}
