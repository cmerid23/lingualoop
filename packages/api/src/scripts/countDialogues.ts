import "dotenv/config";
import { pool } from "../db.js";

async function main() {
  if (!pool) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const total = await pool.query<{ c: string }>(`SELECT COUNT(*)::text c FROM lessons`);
  const withDial = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text c FROM lessons WHERE jsonb_array_length(data->'dialogues') > 0`,
  );
  const byPair = await pool.query<{ pair: string; c: string }>(
    `SELECT pair, COUNT(*)::text c
     FROM lessons
     WHERE jsonb_array_length(data->'dialogues') > 0
     GROUP BY pair ORDER BY pair`,
  );
  console.log(`with dialogues: ${withDial.rows[0].c} / ${total.rows[0].c}`);
  console.log("by pair:");
  for (const r of byPair.rows) console.log(`  ${r.pair}: ${r.c}/45`);
  await pool.end();
}
main();
