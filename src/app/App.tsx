import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { useSettingsStore } from "../store/settingsStore";
import { useProgressStore } from "../store/progressStore";
import { runSeed } from "../data/seed";
import { pullFromServer } from "../lib/sync";

export function App() {
  const loadSettings = useSettingsStore((s) => s.load);
  const loadProgress = useProgressStore((s) => s.load);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      // Order matters: seed first so the home screen has lessons to show.
      await runSeed();
      await Promise.all([loadSettings(), loadProgress()]);
      // Pull authoritative server state (no-op without JWT / offline).
      await pullFromServer();
      // Reload local stores in case server state replaced them.
      await Promise.all([loadSettings(), loadProgress()]);
      setBooted(true);
    })().catch((err) => {
      console.error("[boot]", err);
      setBooted(true); // still render so user sees an error rather than blank
    });
  }, [loadSettings, loadProgress]);

  if (!booted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"
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
