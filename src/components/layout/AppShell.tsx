import type { ReactNode } from "react";
import { Flame, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useProgressStore } from "../../store/progressStore";

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const streak = useProgressStore((s) => s.progress.streakDays);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">
              L
            </div>
            <span className="font-semibold">{title ?? "LinguaLoop"}</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              <Flame className="h-4 w-4" aria-hidden />
              {streak}
            </div>
            <Link
              to="/settings"
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
