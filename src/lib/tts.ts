import { LANGUAGES, type LangCode } from "../data/languages";

/**
 * Web Speech TTS wrapper.
 *
 * Free across all 5 languages on modern browsers, with these caveats:
 *   - en/es/fr: rock solid everywhere
 *   - am/ti:    only Chrome/Android ships voices reliably; Safari/Firefox
 *               on desktop usually have nothing. We fall back to the closest
 *               available voice and surface a `degraded` flag so the UI can
 *               warn the user.
 *
 * We deliberately do NOT use any paid TTS in Phase 1. ElevenLabs etc. become
 * an opt-in upgrade in settings later.
 */

let cachedVoices: SpeechSynthesisVoice[] | null = null;

/** Wait until the browser has populated the voice list (some load async). */
export async function getVoices(): Promise<SpeechSynthesisVoice[]> {
  if (cachedVoices && cachedVoices.length) return cachedVoices;

  const synth = window.speechSynthesis;
  const immediate = synth.getVoices();
  if (immediate.length) {
    cachedVoices = immediate;
    return immediate;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cachedVoices = synth.getVoices();
      resolve(cachedVoices);
    }, 1500);

    synth.addEventListener(
      "voiceschanged",
      () => {
        clearTimeout(timer);
        cachedVoices = synth.getVoices();
        resolve(cachedVoices);
      },
      { once: true },
    );
  });
}

/**
 * Voice quality ranking heuristic. Higher = better.
 * Based on observed real-world quality across Chrome / Safari / Edge / Firefox.
 */
function rankVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;

  // Microsoft "Natural" voices (Edge) are top tier
  if (name.includes("natural")) score += 100;
  // Google network voices on Chrome are very good
  if (name.includes("google")) score += 80;
  // Apple "Premium" / "Enhanced" downloaded voices are excellent
  if (name.includes("premium")) score += 90;
  if (name.includes("enhanced")) score += 70;
  // Local synthesizers tend to be lower-quality than network voices,
  // but they work offline — small bonus.
  if (v.localService) score += 5;
  // Default voice for the locale gets a small boost
  if (v.default) score += 3;

  return score;
}

export interface VoicePick {
  voice: SpeechSynthesisVoice | null;
  degraded: boolean; // true if we couldn't find an exact-language match
  reason?: string;
}

export async function pickVoice(lang: LangCode): Promise<VoicePick> {
  const meta = LANGUAGES[lang];
  const voices = await getVoices();
  if (!voices.length) {
    return {
      voice: null,
      degraded: true,
      reason: "No TTS voices available on this device.",
    };
  }

  // 1. Exact bcp47 match (e.g. "am-ET")
  const exact = voices.filter((v) => v.lang === meta.bcp47);
  if (exact.length) {
    exact.sort((a, b) => rankVoice(b) - rankVoice(a));
    return { voice: exact[0], degraded: false };
  }

  // 2. Same primary language (e.g. "am-*", "es-*")
  const primary = meta.bcp47.split("-")[0];
  const sameLang = voices.filter((v) => v.lang.toLowerCase().startsWith(primary));
  if (sameLang.length) {
    sameLang.sort((a, b) => rankVoice(b) - rankVoice(a));
    return { voice: sameLang[0], degraded: false };
  }

  // 3. No usable voice. Surface degraded state — DO NOT silently substitute
  // an unrelated voice (e.g. English reading Amharic) because it teaches
  // wrong pronunciation. UI should show a "voice unavailable" notice instead.
  return {
    voice: null,
    degraded: true,
    reason: `No ${meta.name} voice installed. On Android Chrome, install the language pack from system settings. On iOS, voices for this language may not be available.`,
  };
}

export interface SpeakOptions {
  lang: LangCode;
  rate?: number; // 0.5–2, default 0.9 (slightly slow for learners)
  pitch?: number; // 0–2, default 1
  onEnd?: () => void;
  onError?: (err: SpeechSynthesisErrorEvent) => void;
}

/** Speak text and resolve when done. Cancels any in-flight utterance. */
export async function speak(
  text: string,
  options: SpeakOptions,
): Promise<{ ok: boolean; degraded: boolean; reason?: string }> {
  if (!("speechSynthesis" in window)) {
    return { ok: false, degraded: true, reason: "Speech synthesis not supported." };
  }
  const synth = window.speechSynthesis;
  synth.cancel(); // stop anything currently speaking

  const pick = await pickVoice(options.lang);
  if (!pick.voice) {
    return { ok: false, degraded: true, reason: pick.reason };
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.voice = pick.voice;
  utter.lang = pick.voice.lang;
  utter.rate = options.rate ?? 0.9;
  utter.pitch = options.pitch ?? 1;

  return new Promise((resolve) => {
    utter.onend = () => {
      options.onEnd?.();
      resolve({ ok: true, degraded: pick.degraded });
    };
    utter.onerror = (e) => {
      options.onError?.(e);
      resolve({ ok: false, degraded: pick.degraded, reason: e.error });
    };
    synth.speak(utter);
  });
}

/** Stop any currently-speaking utterance. */
export function stop(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
