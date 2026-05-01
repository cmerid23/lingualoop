/**
 * Single source of truth for the languages LinguaLoop supports.
 * Add new languages here. Everything else (TTS, lessons, UI) reads from this.
 */

export type LangCode = "en" | "es" | "am" | "ti" | "fr" | "ar";

export interface LanguageMeta {
  code: LangCode;
  bcp47: string; // What Web Speech API expects, e.g. "am-ET"
  name: string; // English-facing name
  nativeName: string; // How speakers call it
  flag: string; // Emoji flag
  script: "latin" | "geez" | "arabic";
  /** Heuristic: does Web Speech reliably ship this voice on most browsers? */
  ttsReliable: boolean;
  /** Heuristic: does Web Speech reliably do STT for this language? */
  sttReliable: boolean;
}

export const LANGUAGES: Record<LangCode, LanguageMeta> = {
  en: {
    code: "en",
    bcp47: "en-US",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    script: "latin",
    ttsReliable: true,
    sttReliable: true,
  },
  es: {
    code: "es",
    bcp47: "es-ES",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    script: "latin",
    ttsReliable: true,
    sttReliable: true,
  },
  fr: {
    code: "fr",
    bcp47: "fr-FR",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    script: "latin",
    ttsReliable: true,
    sttReliable: true,
  },
  am: {
    code: "am",
    bcp47: "am-ET",
    name: "Amharic",
    nativeName: "አማርኛ",
    flag: "🇪🇹",
    script: "geez",
    // Available on Chrome/Android; spotty elsewhere — we degrade gracefully.
    ttsReliable: false,
    sttReliable: false,
  },
  ti: {
    code: "ti",
    bcp47: "ti-ET",
    name: "Tigrinya",
    nativeName: "ትግርኛ",
    flag: "🇪🇷",
    script: "geez",
    ttsReliable: false,
    sttReliable: false,
  },
  ar: {
    code: "ar",
    bcp47: "ar-SA",
    name: "Arabic",
    nativeName: "العربية",
    flag: "🇸🇦",
    script: "arabic",
    ttsReliable: true,
    sttReliable: true,
  },
};

export const ALL_LANG_CODES: LangCode[] = ["en", "es", "fr", "am", "ti", "ar"];

/** Apply the script-specific font class only when the script needs it. */
export function scriptClass(code: LangCode): string {
  const script = LANGUAGES[code].script;
  if (script === "geez") return "font-geez";
  if (script === "arabic") return "font-arabic";
  return "";
}

/** Build a sorted target-language list given a chosen native language. */
export function targetOptions(native: LangCode): LanguageMeta[] {
  return ALL_LANG_CODES.filter((c) => c !== native).map((c) => LANGUAGES[c]);
}
