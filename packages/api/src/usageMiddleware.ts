import type { NextFunction, Response } from "express";
import { pool } from "./db.js";
import { type AuthedRequest } from "./auth.js";
import { getLimit } from "./limits.js";

type LimitType = "tutorMessages" | "lessonsGenerated";

const TYPES: Record<
  LimitType,
  { col: "tutor_messages" | "lessons_generated"; limitKey: "tutorMessagesPerDay" | "lessonsGeneratedPerDay" }
> = {
  tutorMessages: { col: "tutor_messages", limitKey: "tutorMessagesPerDay" },
  lessonsGenerated: { col: "lessons_generated", limitKey: "lessonsGeneratedPerDay" },
};

/** YYYY-MM-DD in UTC. */
export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ISO 8601 of next UTC midnight. */
export function midnightUtcTomorrow(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/**
 * Middleware factory. Use as:
 *   app.post("/api/tutor", requireAuth, checkLimit("tutorMessages"), handler)
 *
 * Reads the user's plan + today's usage in a single SELECT, returns 429 if
 * the user is at or over their quota, otherwise atomically increments the
 * counter and continues. Premium (limit = -1) always passes; we still
 * increment usage for analytics.
 */
export function checkLimit(type: LimitType) {
  const { col, limitKey } = TYPES[type];

  return async function (req: AuthedRequest, res: Response, next: NextFunction) {
    if (!pool) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }
    if (!req.user) {
      res.status(401).json({ error: "Auth required" });
      return;
    }

    try {
      const today = todayUtcDate();

      // Pull the plan + current count in one shot. LEFT JOIN so a user with
      // no row yet still returns the user line (used = 0).
      const lookup = await pool.query<{ plan: string; used: string | number }>(
        `SELECT u.subscription_plan AS plan,
                COALESCE(d.${col}, 0) AS used
         FROM users u
         LEFT JOIN daily_usage d ON d.user_id = u.id AND d.date = $2
         WHERE u.id = $1`,
        [req.user.id, today],
      );
      const row = lookup.rows[0];
      if (!row) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const plan = row.plan;
      const used = Number(row.used);
      // Admins bypass daily limits entirely; usage is still incremented
      // below so analytics keep working.
      const limit =
        req.user.role === "admin" ? -1 : getLimit(plan, limitKey);

      if (limit !== -1 && used >= limit) {
        res.status(429).json({
          error: "daily_limit_reached",
          message: "You have reached your daily limit for this feature.",
          limit,
          used,
          plan,
          resetAt: midnightUtcTomorrow(),
          upgradeUrl: "/pricing",
        });
        return;
      }

      // Atomic increment.
      await pool.query(
        `INSERT INTO daily_usage (user_id, date, ${col})
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, date) DO UPDATE
           SET ${col} = daily_usage.${col} + 1`,
        [req.user.id, today],
      );

      next();
    } catch (err) {
      console.error(`checkLimit(${type}) failed`, err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };
}
