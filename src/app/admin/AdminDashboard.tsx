import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { AdminOverview } from "./AdminOverview";
import { AdminLearners } from "./AdminLearners";
import { AdminSubscriptions } from "./AdminSubscriptions";
import { AdminRevenue } from "./AdminRevenue";

type Tab = "overview" | "learners" | "subscriptions" | "revenue";

const NAV: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "learners", label: "Learners", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "revenue", label: "Revenue", icon: BarChart3 },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-full min-h-screen bg-surface text-ink">
      {/* Sidebar */}
      <nav className="hidden lg:flex w-[88px] flex-col items-center gap-2 bg-ink py-7 shadow-lift">
        <Link
          to="/admin"
          aria-label="LinguaLoop admin"
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
        >
          LL
        </Link>

        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              title={label}
              aria-label={label}
              className={`group relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition ${
                active
                  ? "bg-gold/20 text-gold"
                  : "text-white/35 hover:bg-white/[0.07] hover:text-white/70"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              {active && (
                <span className="absolute -right-px h-7 w-[3px] rounded-l bg-gold" />
              )}
            </button>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white/35 transition hover:bg-white/[0.07] hover:text-coral"
          >
            <LogOut className="h-[22px] w-[22px]" />
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-surface-3 bg-surface/95 px-6 py-5 backdrop-blur-md lg:px-9">
          <div>
            <h1 className="font-display text-[22px] font-semibold leading-tight">
              {NAV.find((n) => n.id === tab)?.label}
            </h1>
            <p className="text-[13px] font-light text-ink-3">
              {tab === "overview"
                ? "Pulse of the platform — at a glance."
                : tab === "learners"
                  ? "Search, inspect, and manage every learner."
                  : tab === "subscriptions"
                    ? "Active subscriptions and lifecycle."
                    : "Monthly revenue, broken down by plan."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet/10 px-3 py-1 text-xs font-semibold text-violet">
              Admin
            </span>
            <span className="hidden text-sm font-medium text-ink-3 sm:inline">
              {user?.fullName ?? user?.email}
            </span>
          </div>
        </header>

        {/* Mobile tab strip */}
        <div className="lg:hidden border-b border-surface-2 bg-white px-3 py-2 overflow-x-auto">
          <div className="flex gap-2">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-ink text-white"
                      : "bg-surface-2 text-ink-3"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-7 lg:px-9">
          {tab === "overview" && <AdminOverview />}
          {tab === "learners" && <AdminLearners />}
          {tab === "subscriptions" && <AdminSubscriptions />}
          {tab === "revenue" && <AdminRevenue />}
        </div>
      </main>
    </div>
  );
}
