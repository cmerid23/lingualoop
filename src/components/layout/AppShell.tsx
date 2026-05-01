import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  BookOpen,
  Globe,
  Repeat,
  Settings as SettingsIcon,
  Zap,
  Shield,
} from "lucide-react";
import { useProgressStore } from "../../store/progressStore";
import { useAuthStore } from "../../store/authStore";
import { fetchUsageToday, type UsageBucket } from "../../lib/usage";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  /** Hide the top bar (used inside lesson runs that have their own progress bar) */
  bare?: boolean;
}

interface NavLinkProps {
  to: string;
  active: boolean;
  label: string;
  icon: ReactNode;
  /** Optional accent color for the active state — defaults to gold. */
  accent?: "gold" | "violet";
}

function NavLink({ to, active, label, icon, accent = "gold" }: NavLinkProps) {
  const accentBg = accent === "violet" ? "bg-violet/20" : "bg-gold/20";
  const accentText = accent === "violet" ? "text-violet-light" : "text-gold";
  const railColor = accent === "violet" ? "bg-violet" : "bg-gold";
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={`group relative flex h-[52px] w-[52px] items-center justify-center rounded-2xl transition ${
        active
          ? `${accentBg} ${accentText}`
          : "text-white/35 hover:bg-white/[0.07] hover:text-white/70"
      }`}
    >
      {icon}
      {active && (
        <span className={`absolute -right-px h-7 w-[3px] rounded-l ${railColor}`} />
      )}
    </Link>
  );
}

function UsagePill({ bucket }: { bucket: UsageBucket | null }) {
  if (!bucket) return null;
  const unlimited = bucket.limit === -1;
  const exhausted = !unlimited && bucket.remaining <= 0;
  const low = !unlimited && !exhausted && bucket.remaining / bucket.limit < 0.2;

  const tone = unlimited
    ? { bg: "rgba(46,196,182,0.15)", color: "var(--teal-dark)" }
    : exhausted
      ? { bg: "rgba(255,107,107,0.18)", color: "var(--coral)" }
      : low
        ? { bg: "rgba(200,151,58,0.18)", color: "var(--gold-light)" }
        : { bg: "rgba(46,196,182,0.15)", color: "var(--teal-dark)" };

  return (
    <Link
      to="/pricing"
      title="AI tutor messages remaining today"
      className="flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold tabular-nums transition hover:opacity-80"
      style={tone}
    >
      💬{" "}
      {unlimited ? (
        <span className="ml-0.5">∞</span>
      ) : (
        <span className="ml-0.5">
          {bucket.remaining}/{bucket.limit}
        </span>
      )}
    </Link>
  );
}

function planPillClass(plan: string): string {
  if (plan === "premium")
    return "bg-gold/15 text-gold border border-gold/30";
  if (plan === "pro")
    return "bg-teal/15 text-teal-dark border border-teal/30";
  return "bg-surface-2 text-ink-3 border border-surface-3";
}

export function AppShell({ children, title, bare = false }: AppShellProps) {
  const streak = useProgressStore((s) => s.progress.streakDays);
  const xp = useProgressStore((s) => s.progress.xp);
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const [tutorUsage, setTutorUsage] = useState<UsageBucket | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchUsageToday()
      .then((u) => setTutorUsage(u.tutor))
      .catch(() => setTutorUsage(null));
  }, [user]);

  const isHome = pathname === "/home";
  const isLesson = pathname.startsWith("/lesson");
  const isSettings = pathname.startsWith("/settings");
  const isPricing = pathname.startsWith("/pricing");
  const isAdmin = pathname.startsWith("/admin");
  const isReview = pathname.startsWith("/review");

  const plan = user?.subscriptionPlan ?? "free";
  const isAdminUser = user?.role === "admin";
  const initial =
    (user?.fullName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-full min-h-screen bg-surface text-ink">
      {/* ── SIDEBAR ── */}
      <nav className="hidden lg:flex w-[88px] flex-col items-center gap-2 bg-ink py-7 shadow-lift">
        <Link
          to="/home"
          aria-label="LinguaLoop home"
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
        >
          LL
        </Link>

        <NavLink to="/home" active={isHome} label="Home" icon={<HomeIcon className="h-[22px] w-[22px]" />} />
        <NavLink to="/home" active={isLesson} label="Lessons" icon={<BookOpen className="h-[22px] w-[22px]" />} />
        <NavLink to="/settings" active={isSettings} label="Languages" icon={<Globe className="h-[22px] w-[22px]" />} />
        <NavLink to="/review" active={isReview} label="Review" icon={<Repeat className="h-[22px] w-[22px]" />} />

        {isAdminUser && (
          <NavLink
            to="/admin"
            active={isAdmin}
            label="Admin"
            accent="violet"
            icon={<Shield className="h-[22px] w-[22px]" />}
          />
        )}

        <div className="mt-auto flex flex-col items-center gap-2">
          <UsagePill bucket={tutorUsage} />
          <NavLink
            to="/pricing"
            active={isPricing}
            label="Upgrade"
            icon={<Zap className="h-[22px] w-[22px]" />}
          />
          <NavLink
            to="/settings"
            active={isSettings}
            label="Settings"
            icon={<SettingsIcon className="h-[22px] w-[22px]" />}
          />
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-y-auto">
        {!bare && (
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-surface-3 bg-surface/95 px-6 py-5 backdrop-blur-md lg:px-9">
            <div className="flex items-center gap-3 lg:hidden">
              <Link
                to="/home"
                aria-label="LinguaLoop home"
                className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-base font-bold tracking-tighter text-ink"
                style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
              >
                LL
              </Link>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[22px] font-semibold leading-tight truncate">
                {title ?? "LinguaLoop"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-streak hidden sm:inline-flex">🔥 {streak}</span>
              <span className="pill-gold hidden sm:inline-flex">⚡ {xp.toLocaleString()} XP</span>
              {/* Plan badge */}
              <Link
                to="/pricing"
                aria-label="Manage subscription"
                className={`hidden md:inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${planPillClass(plan)}`}
                title={`Current plan: ${plan}`}
              >
                {plan}
              </Link>
              <Link
                to="/settings"
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, var(--teal), var(--violet))" }}
              >
                <span className="text-sm font-bold">{initial}</span>
              </Link>
            </div>
          </header>
        )}
        <div className="animate-screen-in">{children}</div>
      </main>
    </div>
  );
}
