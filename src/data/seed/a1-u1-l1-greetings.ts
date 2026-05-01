import type { Lesson } from "../db";
import { lessonId } from "../db";

/**
 * Hand-authored A1 Unit 1 Lesson 1 — "Hello & Goodbye"
 *
 * We seed all 8 pairs that involve English (the most common case). Pairs
 * between two non-English target langs (e.g. es-am) get generated on demand
 * by Claude when first opened.
 *
 * Translations and transliterations were authored by hand to be safe. Native
 * speakers should still review before public launch.
 */

const NOW = Date.now();

function make(
  pair: string,
  title: string,
  vocab: Lesson["vocab"],
  phrases: Lesson["phrases"],
): Lesson {
  return {
    id: lessonId(pair, 1, 1, 1),
    pair,
    unit: 1,
    lessonNum: 1,
    level: "A1",
    title,
    vocab,
    phrases,
    source: "seed",
    schemaVersion: 1,
    createdAt: NOW,
  };
}

// ---------- English → Spanish ----------
const enEs = make(
  "en-es",
  "Hello & Goodbye",
  [
    { src: "hello", tgt: "hola", imageQuery: "hand wave hello greeting" },
    { src: "goodbye", tgt: "adiós", imageQuery: "waving goodbye" },
    { src: "good morning", tgt: "buenos días", imageQuery: "sunrise morning" },
    { src: "good night", tgt: "buenas noches", imageQuery: "starry night sky" },
    { src: "thank you", tgt: "gracias", imageQuery: "thank you grateful" },
    { src: "please", tgt: "por favor" },
    { src: "yes", tgt: "sí" },
    { src: "no", tgt: "no" },
  ],
  [
    { src: "How are you?", tgt: "¿Cómo estás?" },
    { src: "I am well, thank you.", tgt: "Estoy bien, gracias." },
    { src: "Nice to meet you.", tgt: "Encantado de conocerte." },
  ],
);

// ---------- English → French ----------
const enFr = make(
  "en-fr",
  "Hello & Goodbye",
  [
    { src: "hello", tgt: "bonjour", imageQuery: "hand wave hello greeting" },
    { src: "goodbye", tgt: "au revoir", imageQuery: "waving goodbye" },
    { src: "good morning", tgt: "bonjour", imageQuery: "sunrise morning" },
    { src: "good evening", tgt: "bonsoir", imageQuery: "evening sunset" },
    { src: "thank you", tgt: "merci", imageQuery: "thank you grateful" },
    { src: "please", tgt: "s'il vous plaît" },
    { src: "yes", tgt: "oui" },
    { src: "no", tgt: "non" },
  ],
  [
    { src: "How are you?", tgt: "Comment ça va ?" },
    { src: "I am well, thank you.", tgt: "Je vais bien, merci." },
    { src: "Nice to meet you.", tgt: "Enchanté." },
  ],
);

// ---------- English → Amharic ----------
const enAm = make(
  "en-am",
  "Hello & Goodbye",
  [
    {
      src: "hello",
      tgt: "ሰላም",
      translit: "selam",
      imageQuery: "hand wave hello greeting",
    },
    {
      src: "goodbye",
      tgt: "ቻው",
      translit: "chaw",
      imageQuery: "waving goodbye",
    },
    {
      src: "good morning",
      tgt: "እንደምን አደርክ",
      translit: "endemen aderk",
      imageQuery: "sunrise morning",
      // (masculine address; lesson notes will explain gendered forms later)
    },
    {
      src: "thank you",
      tgt: "አመሰግናለሁ",
      translit: "ameseginalehu",
      imageQuery: "thank you grateful",
    },
    { src: "please", tgt: "እባክዎ", translit: "ebakwo" },
    { src: "yes", tgt: "አዎ", translit: "awo" },
    { src: "no", tgt: "አይ", translit: "ay" },
  ],
  [
    { src: "How are you?", tgt: "እንዴት ነህ?", translit: "endet neh?" },
    {
      src: "I am well, thank you.",
      tgt: "ደህና ነኝ፣ አመሰግናለሁ።",
      translit: "dehna negn, ameseginalehu.",
    },
    {
      src: "Nice to meet you.",
      tgt: "ስለተዋወቅን ደስ ብሎኛል።",
      translit: "siletewawekn des bilognal.",
    },
  ],
);

// ---------- English → Tigrinya ----------
const enTi = make(
  "en-ti",
  "Hello & Goodbye",
  [
    {
      src: "hello",
      tgt: "ሰላም",
      translit: "selam",
      imageQuery: "hand wave hello greeting",
    },
    {
      src: "goodbye",
      tgt: "ደሓን ኩን",
      translit: "dehan kun",
      imageQuery: "waving goodbye",
    },
    {
      src: "good morning",
      tgt: "ከመይ ሓዲርካ",
      translit: "kemey hadirka",
      imageQuery: "sunrise morning",
    },
    {
      src: "thank you",
      tgt: "የቐንየለይ",
      translit: "yekenyeley",
      imageQuery: "thank you grateful",
    },
    { src: "please", tgt: "በጃኹም", translit: "bejakhum" },
    { src: "yes", tgt: "እወ", translit: "ewe" },
    { src: "no", tgt: "ኖ", translit: "no" },
  ],
  [
    { src: "How are you?", tgt: "ከመይ ኣለኻ?", translit: "kemey aleka?" },
    {
      src: "I am well, thank you.",
      tgt: "ጽቡቕ ኣለኹ፣ የቐንየለይ።",
      translit: "tsibuq aleku, yekenyeley.",
    },
    {
      src: "Nice to meet you.",
      tgt: "ብምርኻብና ሕጉስ እየ።",
      translit: "bimirikabna higus eye.",
    },
  ],
);

// ---------- English → Arabic ----------
const enAr = make(
  "en-ar",
  "Hello & Goodbye",
  [
    {
      src: "hello",
      tgt: "مرحبا",
      translit: "marhaba",
      imageQuery: "hand wave hello greeting",
    },
    {
      src: "goodbye",
      tgt: "مع السلامة",
      translit: "ma'a as-salama",
      imageQuery: "waving goodbye",
    },
    {
      src: "good morning",
      tgt: "صباح الخير",
      translit: "sabah al-khayr",
      imageQuery: "sunrise morning",
    },
    {
      src: "good night",
      tgt: "تصبح على خير",
      translit: "tusbih 'ala khayr",
      imageQuery: "starry night sky",
    },
    {
      src: "thank you",
      tgt: "شكرا",
      translit: "shukran",
      imageQuery: "thank you grateful",
    },
    { src: "please", tgt: "من فضلك", translit: "min fadlik" },
    { src: "yes", tgt: "نعم", translit: "na'am" },
    { src: "no", tgt: "لا", translit: "la" },
  ],
  [
    { src: "How are you?", tgt: "كيف حالك؟", translit: "kayfa haluk?" },
    {
      src: "I am well, thank you.",
      tgt: "بخير، شكرا",
      translit: "bikhayr, shukran",
    },
    { src: "Nice to meet you.", tgt: "تشرفنا", translit: "tasharrafna" },
  ],
);

// ---------- Reverse pairs (target → English) ----------
function reverse(lesson: Lesson, newPair: string, title: string): Lesson {
  return make(
    newPair,
    title,
    lesson.vocab.map((v) => ({
      src: v.tgt,
      tgt: v.src,
      // keep transliteration on the SOURCE side now
      translit: v.translit,
      imageQuery: v.imageQuery,
    })),
    lesson.phrases.map((p) => ({
      src: p.tgt,
      tgt: p.src,
      translit: p.translit,
    })),
  );
}

const esEn = reverse(enEs, "es-en", "Saludos y Despedidas");
const frEn = reverse(enFr, "fr-en", "Bonjour & Au Revoir");
const amEn = reverse(enAm, "am-en", "ሰላምታ");
const tiEn = reverse(enTi, "ti-en", "ሰላምታ");
const arEn = reverse(enAr, "ar-en", "تحيات");

export const SEED_LESSONS: Lesson[] = [
  enEs,
  enFr,
  enAm,
  enTi,
  enAr,
  esEn,
  frEn,
  amEn,
  tiEn,
  arEn,
];
