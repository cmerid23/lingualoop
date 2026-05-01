import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, Loader2 } from "lucide-react";
import {
  fetchAdminUsers,
  type AdminUserRow,
} from "../../lib/admin";
import { Avatar, timeAgo } from "./AdminOverview";
import { UserSlideOver } from "./UserSlideOver";

const PLAN_FILTERS = [
  { v: "", label: "All" },
  { v: "free", label: "Free" },
  { v: "pro", label: "Pro" },
  { v: "premium", label: "Premium" },
];

interface Sort {
  key: string;
  order: "asc" | "desc";
}

const SORTABLE: Record<string, string> = {
  fullName: "full_name",
  email: "email",
  subscriptionPlan: "subscription_plan",
  cefrLevel: "subscription_plan", // CEFR isn't a backend sort col → fallback
  streakDays: "streak_days",
  totalXp: "total_xp",
  lastActiveAt: "last_active_at",
  createdAt: "created_at",
};

export function AdminLearners() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "createdAt", order: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function load() {
    setLoading(true);
    setError(null);
    fetchAdminUsers({
      page,
      limit,
      search: search || undefined,
      plan: planFilter || undefined,
      sort: SORTABLE[sort.key] ?? "created_at",
      order: sort.order,
    })
      .then((r) => {
        setRows(r.users);
        setTotal(r.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search, planFilter, sort]);

  // Debounce search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  function toggleSort(key: string) {
    setSort((s) =>
      s.key === key ? { key, order: s.order === "asc" ? "desc" : "asc" } : { key, order: "desc" },
    );
  }

  const SortIcon = useMemo(
    () =>
      function SortIcon({ k }: { k: string }) {
        if (sort.key !== k) return <span className="opacity-30">⇅</span>;
        return sort.order === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        );
      },
    [sort],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Search + filters */}
      <div className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-full border border-surface-3 bg-surface py-2.5 pl-11 pr-4 text-sm outline-none focus:border-ink-3 focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PLAN_FILTERS.map((p) => (
            <button
              key={p.v}
              onClick={() => {
                setPlanFilter(p.v);
                setPage(1);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                planFilter === p.v
                  ? "bg-ink text-white"
                  : "bg-surface-2 text-ink-3 hover:bg-surface-3"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              <tr>
                <Th k="fullName" current={sort} onClick={toggleSort} icon={<SortIcon k="fullName" />}>
                  Name
                </Th>
                <Th k="email" current={sort} onClick={toggleSort} icon={<SortIcon k="email" />}>
                  Email
                </Th>
                <Th k="subscriptionPlan" current={sort} onClick={toggleSort} icon={<SortIcon k="subscriptionPlan" />}>
                  Plan
                </Th>
                <Th k="cefrLevel" current={sort} onClick={toggleSort} icon={<SortIcon k="cefrLevel" />}>
                  Level
                </Th>
                <Th k="streakDays" current={sort} onClick={toggleSort} icon={<SortIcon k="streakDays" />}>
                  Streak
                </Th>
                <Th k="totalXp" current={sort} onClick={toggleSort} icon={<SortIcon k="totalXp" />}>
                  XP
                </Th>
                <Th k="lastActiveAt" current={sort} onClick={toggleSort} icon={<SortIcon k="lastActiveAt" />}>
                  Last active
                </Th>
                <Th k="createdAt" current={sort} onClick={toggleSort} icon={<SortIcon k="createdAt" />}>
                  Joined
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setOpenId(u.id)}
                  className="cursor-pointer border-t border-surface-2 transition hover:bg-surface"
                >
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName ?? u.email} size={32} />
                      <span className="font-medium">{u.fullName ?? "—"}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-ink-3">{u.email}</td>
                  <td className="py-3 pr-3">
                    <PlanPill plan={u.subscriptionPlan} />
                  </td>
                  <td className="py-3 pr-3 font-medium">{u.cefrLevel}</td>
                  <td className="py-3 pr-3">{u.streakDays}d</td>
                  <td className="py-3 pr-3">{u.totalXp.toLocaleString()}</td>
                  <td className="py-3 pr-3 text-ink-3">{timeAgo(u.lastActiveAt)}</td>
                  <td className="py-3 pr-5 text-ink-3">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm font-light text-ink-3">
                    No learners match these filters.
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

        {/* Pagination */}
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

      {openId && (
        <UserSlideOver
          userId={openId}
          onClose={() => setOpenId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}

function Th({
  children,
  k,
  current,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  k: string;
  current: Sort;
  onClick: (k: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <th className="py-3 pl-5 pr-3 first:pl-5 last:pr-5">
      <button
        onClick={() => onClick(k)}
        className={`flex items-center gap-1.5 transition ${current.key === k ? "text-ink" : "hover:text-ink"}`}
      >
        {children}
        {icon}
      </button>
    </th>
  );
}

function PlanPill({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-surface-2 text-ink-3",
    pro: "bg-teal/10 text-teal-dark",
    premium: "bg-gold/10 text-gold",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[plan] ?? styles.free}`}>
      {plan}
    </span>
  );
}
