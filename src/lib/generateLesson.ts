import type { Lesson, PhraseItem, VocabItem } from "../data/db";
import { db, lessonId } from "../data/db";
import type { LangCode } from "../data/languages";
import { LANGUAGES } from "../data/languages";
import { client, MODELS } from "./claude";

interface GeneratedLessonPayload {
  title: string;
  vocab: VocabItem[];
  phrases: PhraseItem[];
}

const SYSTEM_PROMPT =
  "You are a language curriculum author. Respond ONLY with valid JSON matching the schema exactly. No markdown, no backticks, no preamble.";

function buildUserPrompt(
  unit: number,
  lessonNum: number,
  level: "A1" | "A2" | "B1",
  nativeLang: LangCode,
  targetLang: LangCode,
): string {
  const native = LANGUAGES[nativeLang];
  const target = LANGUAGES[targetLang];
  const targetIsGeez = target.script === "geez";
  const nativeIsGeez = native.script === "geez";
  const needsTranslit = targetIsGeez || nativeIsGeez;

  return [
    `Write CEFR ${level} Unit ${unit} Lesson ${lessonNum} for a learner whose native language is ${native.name} (${native.nativeName}) studying ${target.name} (${target.nativeName}).`,
    `"src" is the ${native.name} side, "tgt" is the ${target.name} side.`,
    needsTranslit
      ? `Because ${target.name === "Amharic" || target.name === "Tigrinya" ? target.name : native.name} uses the Geʽez script, include a "translit" field (Latin romanization) on every vocab item and phrase that contains Geʽez characters.`
      : `Do not include "translit" — both languages use the Latin script.`,
    `Provide 8 vocab items and 3 phrases appropriate for the unit theme. Each vocab item may include an "imageQuery" string (a 2-5 word visual description in English suitable for a stock-image search). Phrases should be useful sentence-level expressions, not single words.`,
    `Respond with ONLY this JSON object — no other keys, no wrapping:`,
    `{"title": string, "vocab": [{"src": string, "tgt": string, "translit"?: string, "imageQuery"?: string}], "phrases": [{"src": string, "tgt": string, "translit"?: string}]}`,
  ].join("\n\n");
}

export async function generateLesson(
  pair: string,
  unit: number,
  lessonNum: number,
  level: "A1" | "A2" | "B1",
  nativeLang: LangCode,
  targetLang: LangCode,
): Promise<Lesson> {
  const response = await client.messages.create({
    model: MODELS.smart,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(unit, lessonNum, level, nativeLang, targetLang),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";

  let parsed: GeneratedLessonPayload;
  try {
    parsed = JSON.parse(raw) as GeneratedLessonPayload;
  } catch (err) {
    throw new Error(
      `generateLesson: failed to parse JSON from Claude. Raw response:\n${raw}`,
    );
  }

  const lesson: Lesson = {
    id: lessonId(pair, unit, lessonNum, 1),
    pair,
    unit,
    lessonNum,
    level,
    title: parsed.title,
    vocab: parsed.vocab,
    phrases: parsed.phrases,
    source: "ai",
    schemaVersion: 1,
    createdAt: Date.now(),
  };

  await db.lessons.put(lesson);
  return lesson;
}
