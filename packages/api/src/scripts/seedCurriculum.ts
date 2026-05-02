/**
 * One-shot bulk curriculum generator.
 *
 * Iterates `CURATED_PAIRS × CURRICULUM_SLOTS`, asks Claude to write each
 * lesson on-brief, and inserts them into the `lessons` table with
 * source = "curated". Skips lessons that already exist so the script is
 * safe to re-run after an aborted run or after extending the spec.
 *
 * Run once locally pointed at your prod DB:
 *   pnpm --filter @lingualoop/api seed-curriculum
 *
 * Required env (read from packages/api/.env):
 *   - DATABASE_URL
 *   - ANTHROPIC_API_KEY
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { pool } from "../db.js";
import { CURATED_PAIRS, CURRICULUM_SLOTS, type CurriculumSlot } from "../curriculum.js";

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

// ── Language metadata (subset of frontend; only what the prompt needs) ─────
type ScriptKind = "latin" | "geez" | "arabic";
const LANG_META: Record<string, { name: string; nativeName: string; script: ScriptKind }> = {
  en: { name: "English", nativeName: "English", script: "latin" },
  es: { name: "Spanish", nativeName: "Español", script: "latin" },
  fr: { name: "French", nativeName: "Français", script: "latin" },
  am: { name: "Amharic", nativeName: "አማርኛ", script: "geez" },
  ti: { name: "Tigrinya", nativeName: "ትግርኛ", script: "geez" },
  ar: { name: "Arabic", nativeName: "العربية", script: "arabic" },
};

const SYSTEM = "You are a language curriculum author. Respond ONLY with valid JSON matching the schema exactly. No markdown, no backticks, no preamble.";

function buildPrompt(
  slot: CurriculumSlot,
  nativeLang: string,
  targetLang: string,
): string {
  const native = LANG_META[nativeLang];
  const target = LANG_META[targetLang];
  const needsTranslit = target.script !== "latin" || native.script !== "latin";

  return [
    `Write CEFR ${slot.level} Unit ${slot.unit} Lesson ${slot.lessonNum} for a learner whose native language is ${native.name} (${native.nativeName}) studying ${target.name} (${target.nativeName}).`,
    `Lesson theme: "${slot.theme}". Focus: ${slot.focus}.`,
    `"src" is the ${native.name} side, "tgt" is the ${target.name} side.`,
    needsTranslit
      ? `Because one of the languages uses a non-Latin script, include a "translit" field (Latin romanization) on every vocab item, phrase, and dialogue turn that contains non-Latin characters.`
      : `Do not include "translit" — both languages use the Latin script.`,
    `Provide exactly 8 vocab items and 3 phrases on the lesson theme. Each vocab item may include an "imageQuery" (2–5 word visual description in English suitable for a stock-image search). Phrases should be useful sentence-level expressions, not single words. Make the title field exactly: "${slot.theme}".`,
    `Also provide ONE realistic short dialogue (6–8 turns) that uses the lesson's vocab and phrases naturally. Speaker A is a native ${target.name} speaker; speaker B is the learner. Alternate turns starting with A. Use only ${slot.level}-level grammar.`,
    `Respond with ONLY this JSON object — no other keys, no wrapping:`,
    `{"title": string, "vocab": [{"src": string, "tgt": string, "translit"?: string, "imageQuery"?: string}], "phrases": [{"src": string, "tgt": string, "translit"?: string}], "dialogues": [{"scenario": string, "turns": [{"speaker": "A"|"B", "src": string, "tgt": string, "translit"?: string}]}]}`,
  ].join("\n\n");
}

interface GeneratedDialogue {
  scenario: string;
  turns: unknown[];
}

interface GeneratedLesson {
  title: string;
  vocab: unknown[];
  phrases: unknown[];
  dialogues?: GeneratedDialogue[];
}

function lessonId(pair: string, unit: number, lessonNum: number): string {
  return `${pair}:${unit}:${lessonNum}:v1`;
}

async function lessonExists(id: string): Promise<boolean> {
  const r = await pool!.query<{ id: string }>(`SELECT id FROM lessons WHERE id = $1`, [id]);
  return r.rows.length > 0;
}

async function generateOne(
  pair: string,
  slot: CurriculumSlot,
): Promise<{ ok: boolean; reason?: string }> {
  const [nativeLang, targetLang] = pair.split("-");
  if (!LANG_META[nativeLang] || !LANG_META[targetLang]) {
    return { ok: false, reason: `Unknown lang in pair ${pair}` };
  }
  const id = lessonId(pair, slot.unit, slot.lessonNum);
  if (await lessonExists(id)) return { ok: true, reason: "exists" };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2200,
    system: SYSTEM,
    messages: [{ role: "user", content: buildPrompt(slot, nativeLang, targetLang) }],
  });
  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  let parsed: GeneratedLesson;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: `Invalid JSON for ${id}` };
  }

  const lesson = {
    id,
    pair,
    unit: slot.unit,
    lessonNum: slot.lessonNum,
    level: slot.level,
    title: parsed.title || slot.theme,
    vocab: parsed.vocab,
    phrases: parsed.phrases,
    dialogues: parsed.dialogues ?? [],
    source: "curated" as const,
    schemaVersion: 1,
    createdAt: Date.now(),
  };

  await pool!.query(
    `INSERT INTO lessons (id, pair, unit, lesson_num, level, data, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data, source = EXCLUDED.source, created_at = NOW()`,
    [lesson.id, pair, slot.unit, slot.lessonNum, slot.level, JSON.stringify(lesson), lesson.source],
  );
  return { ok: true };
}

async function main() {
  const total = CURATED_PAIRS.length * CURRICULUM_SLOTS.length;
  console.log(
    `Seeding ${total} lessons (${CURATED_PAIRS.length} pairs × ${CURRICULUM_SLOTS.length} slots)…`,
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  let i = 0;

  for (const pair of CURATED_PAIRS) {
    for (const slot of CURRICULUM_SLOTS) {
      i++;
      const label = `[${i}/${total}] ${pair} ${slot.level} U${slot.unit}L${slot.lessonNum} "${slot.theme}"`;
      try {
        const result = await generateOne(pair, slot);
        if (!result.ok) {
          failed++;
          console.warn(`  ✗ ${label}  →  ${result.reason}`);
        } else if (result.reason === "exists") {
          skipped++;
          console.log(`  · ${label}  →  already cached`);
        } else {
          generated++;
          console.log(`  ✓ ${label}`);
        }
      } catch (err) {
        failed++;
        console.warn(`  ✗ ${label}  →  ${err instanceof Error ? err.message : String(err)}`);
      }
      // Light rate-limit cushion to be polite to Anthropic.
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `\nDone. Generated ${generated}, skipped ${skipped}, failed ${failed} (of ${total}).`,
  );
  await pool!.end();
}

main().catch(async (err) => {
  console.error("Seed failed", err);
  if (pool) await pool.end();
  process.exit(1);
});
