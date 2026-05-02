/**
 * Supplemental migration: add a "dialogues" field to every existing
 * curated lesson without regenerating its vocab/phrases. Runs once after
 * adding conversation practice to the lesson schema.
 *
 * Lighter prompt + smaller max_tokens than the full curriculum seeder
 * since we only need 1 dialogue (5–8 turns) per lesson.
 *
 *   pnpm --filter @lingualoop/api add-dialogues
 *
 * Idempotent — skips lessons that already have dialogues.
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { pool } from "../db.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY missing in packages/api/.env");
  process.exit(1);
}
if (!pool) {
  console.error("DATABASE_URL missing in packages/api/.env");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

type ScriptKind = "latin" | "geez" | "arabic";
const LANG_META: Record<string, { name: string; script: ScriptKind }> = {
  en: { name: "English", script: "latin" },
  es: { name: "Spanish", script: "latin" },
  fr: { name: "French", script: "latin" },
  am: { name: "Amharic", script: "geez" },
  ti: { name: "Tigrinya", script: "geez" },
  ar: { name: "Arabic", script: "arabic" },
};

const SYSTEM =
  "You write short, realistic dialogues for language learners. Respond ONLY with valid JSON. No markdown, no backticks, no preamble.";

interface VocabSample {
  src: string;
  tgt: string;
  translit?: string;
}

function buildDialoguePrompt(
  level: string,
  title: string,
  pair: string,
  vocab: VocabSample[],
  phrases: VocabSample[],
): string {
  const [nativeLang, targetLang] = pair.split("-");
  const native = LANG_META[nativeLang];
  const target = LANG_META[targetLang];
  const needsTranslit = target.script !== "latin" || native.script !== "latin";

  const vocabList = vocab
    .slice(0, 8)
    .map((v) => `  - ${v.tgt} (${v.src})`)
    .join("\n");
  const phraseList = phrases
    .slice(0, 3)
    .map((p) => `  - ${p.tgt} (${p.src})`)
    .join("\n");

  return [
    `Write ONE realistic short dialogue (6–8 turns) for a CEFR ${level} ${target.name} lesson titled "${title}". The learner's native language is ${native.name}.`,
    `Use the lesson's existing vocab and phrases naturally. Don't introduce vocabulary outside the ${level} level.`,
    `Vocabulary in this lesson:\n${vocabList}`,
    `Phrases in this lesson:\n${phraseList}`,
    `Speaker A is a native ${target.name} speaker (e.g. shopkeeper, friend, doctor — depending on the theme).`,
    `Speaker B is the learner. Start with speaker A and alternate.`,
    needsTranslit
      ? `Include a "translit" field on every turn whose tgt contains non-Latin characters.`
      : `Do not include "translit" — both languages use the Latin script.`,
    `"src" is the ${native.name} translation. "tgt" is the ${target.name} text.`,
    `Respond with ONLY this JSON object — no other keys, no wrapping:`,
    `{"scenario": string, "turns": [{"speaker": "A"|"B", "src": string, "tgt": string, "translit"?: string}]}`,
  ].join("\n\n");
}

interface ParsedDialogue {
  scenario: string;
  turns: unknown[];
}

interface LessonRow {
  id: string;
  pair: string;
  level: string;
  data: {
    title: string;
    vocab: VocabSample[];
    phrases: VocabSample[];
    dialogues?: unknown[];
    [k: string]: unknown;
  };
}

async function addDialogueTo(row: LessonRow): Promise<{ ok: boolean; reason?: string }> {
  const existing = row.data.dialogues;
  if (Array.isArray(existing) && existing.length > 0) {
    return { ok: true, reason: "exists" };
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: buildDialoguePrompt(
          row.level,
          row.data.title ?? "Conversation",
          row.pair,
          row.data.vocab ?? [],
          row.data.phrases ?? [],
        ),
      },
    ],
  });
  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  let parsed: ParsedDialogue;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid JSON" };
  }
  if (!parsed.scenario || !Array.isArray(parsed.turns) || parsed.turns.length === 0) {
    return { ok: false, reason: "empty dialogue" };
  }

  const newData = {
    ...row.data,
    dialogues: [{ scenario: parsed.scenario, turns: parsed.turns }],
  };
  await pool!.query(
    `UPDATE lessons SET data = $1 WHERE id = $2`,
    [JSON.stringify(newData), row.id],
  );
  return { ok: true };
}

async function main() {
  // Pull every curated lesson that doesn't yet have a non-empty dialogues array.
  const { rows } = await pool!.query<LessonRow>(
    `SELECT id, pair, level, data
     FROM lessons
     WHERE source = 'curated'
       AND (
         data->'dialogues' IS NULL
         OR jsonb_typeof(data->'dialogues') != 'array'
         OR jsonb_array_length(data->'dialogues') = 0
       )
     ORDER BY pair, unit, lesson_num`,
  );

  const total = rows.length;
  console.log(`Adding dialogues to ${total} lessons…`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = `[${i + 1}/${total}] ${row.id} "${row.data.title ?? ""}"`;
    try {
      const result = await addDialogueTo(row);
      if (!result.ok) {
        failed++;
        console.warn(`  ✗ ${label}  →  ${result.reason}`);
      } else if (result.reason === "exists") {
        skipped++;
        console.log(`  · ${label}  →  already has dialogue`);
      } else {
        added++;
        console.log(`  ✓ ${label}`);
      }
    } catch (err) {
      failed++;
      console.warn(
        `  ✗ ${label}  →  ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(
    `\nDone. Added ${added}, skipped ${skipped}, failed ${failed} (of ${total}).`,
  );
  await pool!.end();
}

main().catch(async (err) => {
  console.error("Migration failed", err);
  if (pool) await pool.end();
  process.exit(1);
});
