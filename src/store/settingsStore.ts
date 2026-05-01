import { create } from "zustand";
import { db, type Settings } from "../data/db";
import type { LangCode } from "../data/languages";

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  load: () => Promise<void>;
  save: (
    partial: Omit<Settings, "id" | "createdAt" | "updatedAt"> &
      Partial<Pick<Settings, "createdAt">>,
  ) => Promise<void>;
  isOnboarded: () => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,

  async load() {
    const row = await db.settings.get("me");
    set({ settings: row ?? null, loading: false });
  },

  async save(partial) {
    const now = Date.now();
    const existing = await db.settings.get("me");
    const next: Settings = {
      id: "me",
      nativeLang: partial.nativeLang,
      targetLang: partial.targetLang,
      goal: partial.goal,
      dailyMinutes: partial.dailyMinutes,
      cefrLevel: partial.cefrLevel,
      createdAt: existing?.createdAt ?? partial.createdAt ?? now,
      updatedAt: now,
    };
    await db.settings.put(next);
    set({ settings: next });
  },

  isOnboarded() {
    return get().settings !== null;
  },
}));

/** Tiny helper for components that just need the current pair. */
export function useCurrentPair(): {
  native: LangCode;
  target: LangCode;
} | null {
  const s = useSettingsStore((state) => state.settings);
  if (!s) return null;
  return { native: s.nativeLang, target: s.targetLang };
}
