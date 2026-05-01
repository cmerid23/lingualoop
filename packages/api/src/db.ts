import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Singleton Postgres pool. `null` when DATABASE_URL is unset (local dev
 * without a DB). Routes that need it should be wrapped in `requireDb`.
 */
export const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

if (!pool) {
  console.warn("DATABASE_URL is not set — auth, sync, and lesson persistence are disabled.");
}

export function requireDb(_req: Request, res: Response, next: NextFunction) {
  if (!pool) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }
  next();
}
