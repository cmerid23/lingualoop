import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchAdminRevenue, type MonthlyRevenue } from "../../lib/admin";
import { BarChart, StatCard } from "./charts";

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function AdminRevenue() {
  const [months, setMonths] = useState<MonthlyRevenue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminRevenue()
      .then((r) => setMonths(r.months))
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  if (error)
    return (
      <div className="card text-coral">
        <p className="font-semibold">Couldn't load revenue.</p>
        <p className="mt-1 text-sm font-light">{error}</p>
      </div>
    );

  const totals = months.reduce(
    (acc, m) => {
      acc.free += m.free;
      acc.pro += m.pro;
      acc.premium += m.premium;
      acc.total += m.total;
      return acc;
    },
    { free: 0, pro: 0, premium: 0, total: 0 },
  );

  const labels = months.map((m) => m.month);
  const series = [
    {
      key: "free",
      label: "Free",
      color: "var(--surface-3)",
      values: months.map((m) => m.free),
    },
    {
      key: "pro",
      label: "Pro",
      color: "var(--teal)",
      values: months.map((m) => m.pro),
    },
    {
      key: "premium",
      label: "Premium",
      color: "var(--gold)",
      values: months.map((m) => m.premium),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="12-month revenue" value={usd(totals.total)} accent="ink" />
        <StatCard label="From Pro" value={usd(totals.pro)} accent="teal" />
        <StatCard label="From Premium" value={usd(totals.premium)} accent="gold" />
      </div>

      <div className="card">
        <div className="card-label mb-3">Monthly revenue · last 12 months</div>
        <div className="h-72">
          <BarChart months={labels} series={series} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            <tr>
              <th className="py-3 pl-5 pr-3">Month</th>
              <th className="py-3 pr-3">Free</th>
              <th className="py-3 pr-3">Pro</th>
              <th className="py-3 pr-3">Premium</th>
              <th className="py-3 pr-5">Total</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-t border-surface-2">
                <td className="py-3 pl-5 pr-3 font-medium">{m.month}</td>
                <td className="py-3 pr-3 text-ink-3">{usd(m.free)}</td>
                <td className="py-3 pr-3 text-teal-dark">{usd(m.pro)}</td>
                <td className="py-3 pr-3 text-gold">{usd(m.premium)}</td>
                <td className="py-3 pr-5 font-semibold">{usd(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
