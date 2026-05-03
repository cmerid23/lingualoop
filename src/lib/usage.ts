import { apiFetch } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface UsageBucket {
  used: number;
  limit: number;
  remaining: number;
}

export interface UsageToday {
  date: string;
  plan: string;
  tutor: UsageBucket;
  lessons: UsageBucket;
  resetsAt: string;
}

export async function fetchUsageToday(): Promise<UsageToday> {
  const res = await apiFetch(`${API_BASE}/api/usage/today`);
  if (!res.ok) throw new Error("Failed to fetch usage");
  return (await res.json()) as UsageToday;
}

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/** Returns one of "teal" | "gold" | "coral" — the design accent token. */
export function usageColor(used: number, limit: number): "teal" | "gold" | "coral" {
  if (limit === -1) return "teal";
  if (used >= limit) return "coral";
  const pct = used / limit;
  if (pct >= 0.8) return "gold";
  return "teal";
}
