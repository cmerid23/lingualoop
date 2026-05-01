import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, CheckCircle } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { LANGUAGES, scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { useSpeak } from "../../lib/useSpeak";

interface PronunciationDrillProps {
  item: VocabItem;
  targetLang: LangCode;
  onResult: (grade: 1 | 2 | 3 | 4) => void;
}

type DrillState = "idle" | "playing" | "recording" | "done";

const STT_UNRELIABLE_LANGS: LangCode[] = ["am", "ti"];

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
    if (pct >= 80) return "text-[#22c55e]";
    if (pct >= 50) return "text-gold";
    return "text-coral";
  }
  function accuracyLabel(pct: number): string {
    if (pct >= 85) return "Excellent! 🎉";
    if (pct >= 65) return "Pretty good! Keep going.";
    if (pct >= 40) return "Close — try again.";
    return "Keep practicing — it gets easier!";
  }

  const grades = [
    { grade: 1, label: "Again", emoji: "😓", bg: "rgba(255,107,107,0.1)", color: "var(--coral)" },
    { grade: 2, label: "Hard", emoji: "😤", bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    { grade: 3, label: "Good", emoji: "😊", bg: "rgba(46,196,182,0.1)", color: "var(--teal-dark)" },
    { grade: 4, label: "Easy", emoji: "🎉", bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  ] as const;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-center text-[15px] font-medium text-ink-3">
        Listen, then say it out loud
      </p>

      <div className="flex h-[140px] w-[140px] items-center justify-center rounded-[28px] border-2 border-surface-2 bg-white shadow-lift animate-float">
        <SketchImage word={item.src} size={100} />
      </div>

      <div className="text-center">
        <div
          className={`font-display text-[36px] font-bold leading-none tracking-tight text-ink ${scriptClass(targetLang)}`}
        >
          {item.tgt}
        </div>
        {item.translit && (
          <div className="mt-1.5 text-base font-light italic text-ink-3">
            {item.translit}
          </div>
        )}
      </div>

      <button onClick={handleListen} disabled={speaking || state === "recording"} className="btn-ghost">
        <Volume2 className="mr-2 h-4 w-4" />
        {speaking ? "Playing…" : "Listen"}
      </button>

      {!sttSupported && state !== "done" && (
        <div
          className="w-full rounded-2xl px-4 py-3 text-sm font-light"
          style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
        >
          🎙️ Microphone scoring isn't available for {meta.name} yet. Listen
          carefully, then self-grade below.
        </div>
      )}

      {sttSupported && state !== "done" && (
        <div className="flex flex-col items-center gap-3">
          {state === "recording" ? (
            <button
              onClick={stopRecording}
              aria-label="Stop recording"
              className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-coral text-white shadow-lift"
            >
              <MicOff className="h-7 w-7" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={state === "playing"}
              aria-label="Start recording"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white shadow-lift transition hover:scale-105 disabled:opacity-50"
            >
              <Mic className="h-7 w-7" />
            </button>
          )}
          <p className="text-xs font-medium text-ink-3">
            {state === "recording" ? "Listening… tap to stop" : "Tap to speak"}
          </p>
        </div>
      )}

      {state === "done" && (
        <div className="flex w-full flex-col gap-4">
          {transcript && (
            <div className="rounded-2xl bg-white border border-surface-2 px-4 py-3 text-center shadow-soft">
              <p className="card-label">You said</p>
              <p className="mt-1 font-semibold text-ink">"{transcript}"</p>
              {accuracy !== null && (
                <p className={`mt-1 text-sm font-bold ${accuracyColor(accuracy)}`}>
                  {accuracy}% match — {accuracyLabel(accuracy)}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-sm font-semibold text-ink">How did it feel?</p>
          <div className="grid grid-cols-4 gap-2.5">
            {grades.map(({ grade, label, emoji, bg, color }) => (
              <button
                key={grade}
                onClick={() => onResult(grade)}
                className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3.5 text-[13px] font-bold transition active:scale-95 hover:opacity-80"
                style={{ background: bg, color }}
              >
                <span className="text-xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!sttSupported && state === "idle" && (
        <div className="flex w-full flex-col gap-3">
          <div className="grid grid-cols-4 gap-2.5">
            {grades.map(({ grade, label, emoji, bg, color }) => (
              <button
                key={grade}
                onClick={() => onResult(grade)}
                className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3.5 text-[13px] font-bold transition active:scale-95 hover:opacity-80"
                style={{ background: bg, color }}
              >
                <span className="text-xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setState("done")} className="btn-ghost">
            <CheckCircle className="mr-2 h-4 w-4" />
            Skip to result
          </button>
        </div>
      )}
    </div>
  );
}
