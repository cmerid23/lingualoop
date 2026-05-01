import type { Lesson, Progress, SrsCard } from "../data/db";
import { db } from "../data/db";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const TOKEN_KEY = "lingualoop:jwt";

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

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
      const res = await fetch(`${API_BASE}/api/sync/progress`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(progress),
      });
      if (!res.ok) console.warn("syncToServer: progress failed", res.status);
    }

    if (cards.length > 0) {
      const res = await fetch(`${API_BASE}/api/sync/cards`, {
        method: "POST",
        headers: authHeaders(token),
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
    const res = await fetch(`${API_BASE}/api/sync/pull`, {
      headers: { authorization: `Bearer ${token}` },
    });
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
