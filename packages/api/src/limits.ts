/**
 * Per-plan daily quotas. -1 means unlimited.
 *
 * `dailyMinutes` is the soft cap surfaced on the home dashboard; the
 * actually-enforced quotas are `tutorMessagesPerDay` and
 * `lessonsGeneratedPerDay` (gated by usageMiddleware).
 */
export const PLAN_LIMITS = {
  free: {
    tutorMessagesPerDay: 10,
    lessonsGeneratedPerDay: 5,
    dailyMinutes: 15,
  },
  pro: {
    tutorMessagesPerDay: 250,
    lessonsGeneratedPerDay: 50,
    dailyMinutes: 120,
  },
  premium: {
    tutorMessagesPerDay: -1,
    lessonsGeneratedPerDay: -1,
    dailyMinutes: -1,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function getLimit(
  plan: string,
  key: keyof typeof PLAN_LIMITS.free,
): number {
  const p = (PLAN_LIMITS as Record<string, (typeof PLAN_LIMITS)[Plan]>)[plan]
    ?? PLAN_LIMITS.free;
  return p[key];
}
