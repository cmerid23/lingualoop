import type { Lesson, Progress, SrsCard } from "../data/db";
import { db } from "../data/db";
import { apiFetch, getToken } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/**
 * Push local Dexie state up to the server. No-ops if offline or unauthenticated.
 * Best-effort: errors are logged, not thrown.
 */
export async function syncToServer(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const token = getToken();
  if (!token) return;

  try {
    const [progress, cards] = await Promise.all([
      db.progress.get("me"),
      db.cards.toArray(),
    ]);

    if (progress) {
      const res = await apiFetch(`${API_BASE}/api/sync/progress`, {
        method: "POST",
        body: JSON.stringify(progress),
      });
      if (!res.ok) console.warn("syncToServer: progress failed", res.status);
    }

    if (cards.length > 0) {
      const res = await apiFetch(`${API_BASE}/api/sync/cards`, {
        method: "POST",
        body: JSON.stringify({ cards }),
      });
      if (!res.ok) console.warn("syncToServer: cards failed", res.status);
    }
  } catch (err) {
    console.warn("syncToServer error", err);
  }
}

/**
 * Pull authoritative state from the server, merging into Dexie (server wins).
 * No-ops if offline or unauthenticated.
 */
export async function pullFromServer(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const token = getToken();
  if (!token) return;

  try {
    const res = await apiFetch(`${API_BASE}/api/sync/pull`);
    if (!res.ok) {
      console.warn("pullFromServer failed", res.status);
      return;
    }
    const data = (await res.json()) as {
      progress: Omit<Progress, "id"> | null;
      cards: SrsCard[];
      lessons: Lesson[];
    };

    if (data.progress) {
      await db.progress.put({ ...data.progress, id: "me" });
    }
    if (data.cards.length > 0) {
      await db.cards.bulkPut(data.cards);
    }
    if (data.lessons.length > 0) {
      await db.lessons.bulkPut(data.lessons);
    }
  } catch (err) {
    console.warn("pullFromServer error", err);
  }
}
