import { create } from "zustand";
import { db, type Progress } from "../data/db";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DEFAULT: Progress = {
  id: "me",
  xp: 0,
  level: 1,
  streakDays: 0,
  lastActiveDate: "",
  minutesToday: 0,
  updatedAt: 0,
};

interface ProgressState {
  progress: Progress;
  loading: boolean;
  load: () => Promise<void>;
  /** Award XP and roll streak forward if first activity of the day. */
  recordActivity: (xpDelta: number, minutesDelta: number) => Promise<void>;
}

const xpToLevel = (xp: number): number => Math.floor(xp / 1000) + 1;

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: DEFAULT,
  loading: true,

  async load() {
    const row = (await db.progress.get("me")) ?? DEFAULT;
    set({ progress: row, loading: false });
  },

  async recordActivity(xpDelta, minutesDelta) {
    const today = todayLocal();
    const yesterday = yesterdayLocal();
    const cur = get().progress;

    let streak = cur.streakDays;
    let minutesToday = cur.minutesToday;

    if (cur.lastActiveDate !== today) {
      // New day. Streak continues if last active was yesterday, else resets to 1.
      streak = cur.lastActiveDate === yesterday ? streak + 1 : 1;
      minutesToday = 0;
    }

    const xp = cur.xp + Math.max(0, xpDelta);
    const next: Progress = {
      id: "me",
      xp,
      level: xpToLevel(xp),
      streakDays: streak,
      lastActiveDate: today,
      minutesToday: minutesToday + Math.max(0, minutesDelta),
      updatedAt: Date.now(),
    };
    await db.progress.put(next);
    set({ progress: next });
  },
}));
