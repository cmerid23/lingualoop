import type { VocabItem } from "../data/db";
import type { LangCode } from "../data/languages";

/**
 * Returns true if `typed` is an acceptable answer for the vocab item.
 * Accepts:
 *  - exact match on the target script (case-insensitive, light punctuation strip)
 *  - exact match on the romanized transliteration (when present)
 *  - 1-character typo tolerance against the target
 *
 * Used by the pronunciation drill's typed-answer card and the sound-first
 * activity's text-input fallback. Same rule across all 6 languages.
 */
export function checkWrittenAnswer(
  typed: string,
  item: VocabItem,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _targetLang: LangCode,
): boolean {
  const clean = (s: string) =>
    s.toLowerCase().trim().replace(/[።?!¿،؟.,]/g, "");
  const typedClean = clean(typed);
  if (typedClean.length === 0) return false;

  // Exact match on target script
  if (typedClean === clean(item.tgt)) return true;

  // Exact match on transliteration (Geʽez + Arabic)
  if (item.translit && typedClean === clean(item.translit)) return true;

  // 1-character fuzzy match against the target
  const target = clean(item.tgt);
  if (Math.abs(typedClean.length - target.length) <= 1) {
    let diff = 0;
    for (let i = 0; i < Math.max(typedClean.length, target.length); i++) {
      if (typedClean[i] !== target[i]) diff++;
    }
    if (diff <= 1) return true;
  }
  return false;
}
