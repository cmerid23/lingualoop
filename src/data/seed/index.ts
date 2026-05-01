import { db } from "../db";
import { SEED_LESSONS } from "./a1-u1-l1-greetings";

/**
 * Seeds the local DB with hand-authored starter content. Idempotent —
 * existing lessons with the same id are skipped so we don't overwrite
 * anything the user may have customized later.
 */
export async function runSeed(): Promise<void> {
  const existing = await db.lessons.bulkGet(SEED_LESSONS.map((l) => l.id));
  const missing = SEED_LESSONS.filter((_, i) => !existing[i]);
  if (missing.length === 0) return;
  await db.lessons.bulkAdd(missing);
  // eslint-disable-next-line no-console
  console.info(`[seed] inserted ${missing.length} starter lesson(s)`);
}
