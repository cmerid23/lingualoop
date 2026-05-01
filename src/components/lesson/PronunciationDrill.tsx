import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, CheckCircle } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { LANGUAGES, scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { Button } from "../ui/Button";
import { useSpeak } from "../../lib/useSpeak";

interface PronunciationDrillProps {
  item: VocabItem;
  targetLang: LangCode;
  onResult: (grade: 1 | 2 | 3 | 4) => void;
}

type DrillState = "idle" | "playing" | "recording" | "done";

const STT_UNRELIABLE_LANGS: LangCode[] = ["am", "ti"];

/**
 * Activity 3: Pronunciation Drill
 *
 * 1. User hears native TTS.
 * 2. They record themselves (Web Speech STT where supported).
 * 3. They self-grade 1–4 OR we compare the transcript text for en/es/fr.
 * 4. For am/ti: STT is skipped; user self-grades after listening.
 */
export function PronunciationDrill({
  item,
  targetLang,
  onResult,
}: PronunciationDrillProps) {
  const { speak, speaking } = useSpeak();
  const [state, setState] = useState<DrillState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const sttSupported =
    !STT_UNRELIABLE_LANGS.includes(targetLang) &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const meta = LANGUAGES[targetLang];

  // Auto-play on mount
  useEffect(() => {
    setState("playing");
    speak(item.tgt, targetLang).then(() => setState("idle"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.tgt]);

  async function handleListen() {
    setState("playing");
    await speak(item.tgt, targetLang);
    setState("idle");
  }

  const startRecording = useCallback(() => {
    const SpeechRec =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRec();
    rec.lang = meta.bcp47;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const heard = e.results[0]?.[0]?.transcript ?? "";
      setTranscript(heard);
      const pct = textSimilarity(
        heard.toLowerCase().trim(),
        item.tgt.toLowerCase().trim(),
      );
      setAccuracy(Math.round(pct * 100));
      setState("done");
    };
    rec.onerror = () => setState("done");
    rec.onend = () => {
      if (state === "recording") setState("done");
    };

    recognitionRef.current = rec;
    rec.start();
    setState("recording");
  }, [meta.bcp47, item.tgt, state]);

  function stopRecording() {
    recognitionRef.current?.stop();
    setState("done");
  }

  // Simple Jaro similarity for short strings (good enough for single words)
  function textSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;
    const range = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);
    let matches = 0;
    let transpositions = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - range);
      const end = Math.min(i + range + 1, b.length);
      for (let j = start; j < end; j++) {
        if (bMatches[j] || a[i] !== b[j]) continue;
        aMatches[i] = true;
        bMatches[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return 0;
    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }
    return (
      (matches / a.length +
        matches / b.length +
        (matches - transpositions / 2) / matches) /
      3
    );
  }

  function accuracyColor(pct: number): string {
    if (pct >= 80) return "text-green-600 dark:text-green-400";
    if (pct >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  }

  function accuracyLabel(pct: number): string {
    if (pct >= 85) return "Excellent! 🎉";
    if (pct >= 65) return "Pretty good! Keep going.";
    if (pct >= 40) return "Close — try again.";
    return "Keep practicing — it gets easier!";
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Listen, then say it out loud
      </p>

      <SketchImage word={item.src} size={120} className="shadow-md" />

      {/* Target word */}
      <div className="text-center">
        <div className={`text-3xl font-bold ${scriptClass(targetLang)}`}>
          {item.tgt}
        </div>
        {item.translit && (
          <div className="mt-1 text-base text-slate-500 italic">{item.translit}</div>
        )}
      </div>

      {/* Listen button */}
      <Button
        variant="ghost"
        onClick={handleListen}
        disabled={speaking || state === "recording"}
      >
        <Volume2 className="mr-2 h-4 w-4" />
        {speaking ? "Playing…" : "Listen"}
      </Button>

      {/* STT not available for this lang */}
      {!sttSupported && state !== "done" && (
        <div className="w-full rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200 ring-1 ring-blue-200">
          🎙️ Microphone scoring isn't available for {meta.name} yet. Listen
          carefully, then self-grade below.
        </div>
      )}

      {/* Recording controls (only for STT-supported langs) */}
      {sttSupported && state !== "done" && (
        <div className="flex flex-col items-center gap-3 w-full">
          {state === "recording" ? (
            <button
              onClick={stopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg animate-pulse"
              aria-label="Stop recording"
            >
              <MicOff className="h-8 w-8" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={state === "playing"}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:bg-brand-600 active:scale-95 disabled:opacity-50"
              aria-label="Start recording"
            >
              <Mic className="h-8 w-8" />
            </button>
          )}
          <p className="text-xs text-slate-500">
            {state === "recording" ? "Listening… tap to stop" : "Tap to speak"}
          </p>
        </div>
      )}

      {/* Result */}
      {state === "done" && (
        <div className="w-full flex flex-col gap-4">
          {transcript && (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-center">
              <p className="text-xs text-slate-500 mb-1">You said</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                "{transcript}"
              </p>
              {accuracy !== null && (
                <p className={`mt-1 text-sm font-bold ${accuracyColor(accuracy)}`}>
                  {accuracy}% match — {accuracyLabel(accuracy)}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            How did it feel?
          </p>

          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { grade: 1, label: "Again", emoji: "😓", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
                { grade: 2, label: "Hard", emoji: "😤", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
                { grade: 3, label: "Good", emoji: "😊", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
                { grade: 4, label: "Easy", emoji: "🎉", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
              ] as const
            ).map(({ grade, label, emoji, color }) => (
              <button
                key={grade}
                onClick={() => onResult(grade)}
                className={`flex flex-col items-center gap-1 rounded-xl py-3 px-2 font-semibold text-xs transition hover:opacity-90 active:scale-95 ${color}`}
              >
                <span className="text-xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* If STT unavailable, show grade buttons immediately */}
      {!sttSupported && state === "idle" && (
        <div className="w-full flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { grade: 1, label: "Again", emoji: "😓", color: "bg-red-100 text-red-800" },
                { grade: 2, label: "Hard", emoji: "😤", color: "bg-orange-100 text-orange-800" },
                { grade: 3, label: "Good", emoji: "😊", color: "bg-blue-100 text-blue-800" },
                { grade: 4, label: "Easy", emoji: "🎉", color: "bg-green-100 text-green-800" },
              ] as const
            ).map(({ grade, label, emoji, color }) => (
              <button
                key={grade}
                onClick={() => onResult(grade)}
                className={`flex flex-col items-center gap-1 rounded-xl py-3 px-2 font-semibold text-xs transition hover:opacity-90 active:scale-95 ${color}`}
              >
                <span className="text-xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setState("done");
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Skip to result
          </Button>
        </div>
      )}
    </div>
  );
}
