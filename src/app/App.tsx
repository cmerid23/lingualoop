import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { useSettingsStore } from "../store/settingsStore";
import { useProgressStore } from "../store/progressStore";
import { useAuthStore } from "../store/authStore";
import { runSeed } from "../data/seed";
import { pullFromServer } from "../lib/sync";

export function App() {
  const loadSettings = useSettingsStore((s) => s.load);
  const loadProgress = useProgressStore((s) => s.load);
  const loadFromToken = useAuthStore((s) => s.loadFromToken);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Restore session first — guards downstream routing decisions.
      await loadFromToken();
      // 2. Seed lessons + load local stores in parallel.
      await runSeed();
      await Promise.all([loadSettings(), loadProgress()]);
      // 3. Pull authoritative server state (no-op if no JWT / offline).
      await pullFromServer();
      // 4. Re-load local stores in case server state replaced them.
      await Promise.all([loadSettings(), loadProgress()]);
      setBooted(true);
    })().catch((err) => {
      console.error("[boot]", err);
      setBooted(true);
    });
  }, [loadSettings, loadProgress, loadFromToken]);

  if (!booted) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-surface-2 border-t-gold"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
