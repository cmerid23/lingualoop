import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home as HomeIcon, BookOpen, Globe, Repeat, Settings as SettingsIcon } from "lucide-react";
import { useProgressStore } from "../../store/progressStore";

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
}

function NavLink({ to, active, label, icon }: NavLinkProps) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={`group relative flex h-13 w-13 h-[52px] w-[52px] items-center justify-center rounded-2xl transition ${
        active
          ? "bg-gold/20 text-gold"
          : "text-white/35 hover:bg-white/[0.07] hover:text-white/70"
      }`}
    >
      {icon}
      {active && (
        <span className="absolute -right-px h-7 w-[3px] rounded-l bg-gold" />
      )}
    </Link>
  );
}

export function AppShell({ children, title, bare = false }: AppShellProps) {
  const streak = useProgressStore((s) => s.progress.streakDays);
  const xp = useProgressStore((s) => s.progress.xp);
  const { pathname } = useLocation();

  const isHome = pathname === "/";
  const isLesson = pathname.startsWith("/lesson");
  const isSettings = pathname.startsWith("/settings");

  return (
    <div className="flex h-full min-h-screen bg-surface text-ink">
      {/* ── SIDEBAR ── */}
      <nav className="hidden lg:flex w-[88px] flex-col items-center gap-2 bg-ink py-7 shadow-lift">
        <Link
          to="/"
          aria-label="LinguaLoop home"
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl font-display text-[22px] font-bold tracking-tighter text-ink"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
        >
          LL
        </Link>

        <NavLink to="/" active={isHome} label="Home" icon={<HomeIcon className="h-[22px] w-[22px]" />} />
        <NavLink to="/" active={isLesson} label="Lessons" icon={<BookOpen className="h-[22px] w-[22px]" />} />
        <NavLink to="/settings" active={isSettings} label="Languages" icon={<Globe className="h-[22px] w-[22px]" />} />
        <NavLink to="/" active={false} label="Review" icon={<Repeat className="h-[22px] w-[22px]" />} />

        <div className="mt-auto flex flex-col items-center gap-2">
          <NavLink to="/settings" active={isSettings} label="Settings" icon={<SettingsIcon className="h-[22px] w-[22px]" />} />
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 overflow-y-auto">
        {!bare && (
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-3 bg-surface/95 px-6 py-5 backdrop-blur-md lg:px-9">
            <div className="flex items-center gap-3 lg:hidden">
              <Link
                to="/"
                aria-label="LinguaLoop home"
                className="flex h-9 w-9 items-center justify-center rounded-xl font-display text-base font-bold tracking-tighter text-ink"
                style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
              >
                LL
              </Link>
            </div>
            <div className="flex-1">
              <h1 className="font-display text-[22px] font-semibold leading-tight">
                {title ?? "LinguaLoop"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="pill-streak">🔥 {streak}</span>
              <span className="pill-gold">⚡ {xp.toLocaleString()} XP</span>
              <Link
                to="/settings"
                aria-label="Settings"
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, var(--teal), var(--violet))" }}
              >
                <span className="text-sm font-bold">C</span>
              </Link>
            </div>
          </header>
        )}
        <div className="animate-screen-in">{children}</div>
      </main>
    </div>
  );
}
