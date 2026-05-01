import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, Type, CheckCircle2, XCircle } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { LANGUAGES, scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { useSpeak } from "../../lib/useSpeak";
import { checkWrittenAnswer } from "../../lib/grading";

interface PronunciationDrillProps {
  item: VocabItem;
  targetLang: LangCode;
  onResult: (grade: 1 | 2 | 3 | 4) => void;
}

type RecState = "idle" | "playing" | "recording" | "scored";

// Languages where browser STT is unreliable enough that we don't trust
// scoring — show the mic but ask the user to self-grade.
const STT_UNRELIABLE_LANGS: LangCode[] = ["am", "ti"];

const PLACEHOLDERS: Partial<Record<LangCode, string>> = {
  am: "e.g. selam or ሰላም",
  ti: "e.g. selam or ሰላም",
  ar: "e.g. marhaba or مرحبا",
};

const GRADES = [
  { grade: 1 as const, label: "Again", emoji: "😓", bg: "rgba(255,107,107,0.1)", color: "var(--coral)" },
  { grade: 2 as const, label: "Hard", emoji: "😤", bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  { grade: 3 as const, label: "Good", emoji: "😊", bg: "rgba(46,196,182,0.1)", color: "var(--teal-dark)" },
  { grade: 4 as const, label: "Easy", emoji: "🎉", bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
];

export function PronunciationDrill({
  item,
  targetLang,
  onResult,
}: PronunciationDrillProps) {
  const { speak, speaking } = useSpeak();
  const meta = LANGUAGES[targetLang];
  const sttUnreliable = STT_UNRELIABLE_LANGS.includes(targetLang);
  const sttSupported =
    !sttUnreliable &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Written input state ───────────────────────────────────────────────
  const [typed, setTyped] = useState("");
  const [writtenResult, setWrittenResult] = useState<"correct" | "wrong" | null>(null);

  // ── Audio state ───────────────────────────────────────────────────────
  const [recState, setRecState] = useState<RecState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [audioGrade, setAudioGrade] = useState<1 | 2 | 3 | 4 | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Auto-play target word on mount.
  useEffect(() => {
    setRecState("playing");
    speak(item.tgt, targetLang).then(() => setRecState("idle"));
    setTyped("");
    setWrittenResult(null);
    setTranscript(null);
    setAccuracy(null);
    setAudioGrade(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.tgt]);

  async function handleListen() {
    setRecState("playing");
    await speak(item.tgt, targetLang);
    setRecState("idle");
  }

  // ── Written check ─────────────────────────────────────────────────────
  function checkTyped() {
    if (writtenResult !== null) return;
    const ok = checkWrittenAnswer(typed, item, targetLang);
    setWrittenResult(ok ? "correct" : "wrong");
  }

  // ── Audio recording ──────────────────────────────────────────────────
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
      setRecState("scored");
    };
    rec.onerror = () => setRecState("scored");
    rec.onend = () => {
      setRecState((s) => (s === "recording" ? "scored" : s));
    };

    recognitionRef.current = rec;
    rec.start();
    setRecState("recording");
  }, [meta.bcp47, item.tgt]);

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecState("scored");
  }

  function selfGrade(g: 1 | 2 | 3 | 4) {
    setAudioGrade(g);
    if (recState === "idle") setRecState("scored");
  }

  // ── Pick the best of the two grades ──────────────────────────────────
  const writtenGrade: 1 | 4 | null =
    writtenResult === "correct" ? 4 : writtenResult === "wrong" ? 1 : null;

  function bestGrade(): 1 | 2 | 3 | 4 | null {
    if (writtenGrade !== null && audioGrade !== null) {
      return Math.max(writtenGrade, audioGrade) as 1 | 2 | 3 | 4;
    }
    return writtenGrade ?? audioGrade;
  }

  function handleContinue() {
    const g = bestGrade();
    if (g !== null) onResult(g);
  }

  // ── Layout ────────────────────────────────────────────────────────────
  const targetScriptCls = scriptClass(targetLang);
  // For the input we use the script font but skip RTL on Arabic so users
  // can comfortably type romanization side-by-side.
  const inputScriptCls =
    targetLang === "am" || targetLang === "ti" ? "font-geez" : "";
  const placeholder = PLACEHOLDERS[targetLang] ?? "Type the word…";

  return (
    <div className="flex w-full flex-col gap-6">
      {/* ── Top: listen ───────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-[140px] w-[140px] items-center justify-center rounded-[28px] border-2 border-surface-2 bg-white shadow-lift animate-float">
          <SketchImage word={item.src} size={100} />
        </div>

        <div className="text-center">
          <div
            className={`font-display text-[36px] font-bold leading-none tracking-tight text-ink ${targetScriptCls}`}
          >
            {item.tgt}
          </div>
          {item.translit && (
            <div className="mt-1.5 text-base font-light italic text-ink-3">
              {item.translit}
            </div>
          )}
          <div className="mt-1 text-[13px] font-medium text-ink-3">
            → {item.src}
          </div>
        </div>

        <button
          onClick={handleListen}
          disabled={speaking || recState === "recording"}
          className="flex h-14 w-14 items-center justify-center rounded-full border-0 bg-ink text-white shadow-lift transition hover:scale-105 disabled:opacity-50"
          aria-label={speaking ? "Playing" : "Listen"}
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {/* ── Two practice cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Written input card */}
        <div
          className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 shadow-soft transition ${
            writtenResult === "correct"
              ? "border-[#22c55e]"
              : writtenResult === "wrong"
                ? "border-coral"
                : "border-surface-2"
          }`}
        >
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-ink-3" />
            <span className="card-label">Type it out</span>
          </div>

          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={writtenResult !== null}
            placeholder={placeholder}
            className={`w-full rounded-xl border border-surface-3 bg-surface px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink-3 focus:bg-white disabled:opacity-70 ${inputScriptCls}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                checkTyped();
              }
            }}
          />

          {meta.script !== "latin" && (
            <p className="text-[11px] font-light text-ink-3">
              {targetLang === "ar"
                ? "Type in Arabic or romanization."
                : "Type in English letters (transliteration OK)."}
            </p>
          )}

          {writtenResult === null ? (
            <button
              onClick={checkTyped}
              disabled={typed.trim().length === 0}
              className="btn-teal w-full"
            >
              Check
            </button>
          ) : writtenResult === "correct" ? (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
            >
              <CheckCircle2 className="h-4 w-4" /> Correct!
            </div>
          ) : (
            <div
              className="flex flex-col gap-1 rounded-xl px-3 py-2 text-sm"
              style={{ background: "rgba(255,107,107,0.1)", color: "var(--coral)" }}
            >
              <span className="flex items-center gap-2 font-semibold">
                <XCircle className="h-4 w-4" /> Not quite
              </span>
              <span className={`font-medium text-ink ${targetScriptCls}`}>
                {item.tgt}
                {item.translit && (
                  <span className="ml-2 text-xs italic text-ink-3">
                    ({item.translit})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Audio recording card */}
        <div
          className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-5 shadow-soft transition ${
            recState === "recording" ? "border-violet" : "border-surface-2"
          }`}
        >
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-ink-3" />
            <span className="card-label">Say it out loud</span>
          </div>

          <div className="flex flex-col items-center gap-3 py-2">
            {recState === "recording" ? (
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-coral text-white shadow-lift"
              >
                <MicOff className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={sttSupported ? startRecording : undefined}
                disabled={!sttSupported || recState === "playing"}
                aria-label={sttSupported ? "Start recording" : "Mic scoring unavailable"}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lift transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mic className="h-6 w-6" />
              </button>
            )}
            <p className="text-[11px] font-medium text-ink-3 text-center">
              {recState === "recording"
                ? "Listening… tap to stop"
                : sttSupported
                  ? "Tap to speak"
                  : `Mic scoring unavailable for ${meta.name} — rate yourself below`}
            </p>
          </div>

          {/* STT result */}
          {transcript && (
            <div className="rounded-xl bg-surface px-3 py-2 text-center">
              <div className="card-label">You said</div>
              <div className="mt-0.5 text-sm font-semibold text-ink">"{transcript}"</div>
              {accuracy !== null && (
                <div
                  className={`mt-0.5 text-xs font-bold ${
                    accuracy >= 80
                      ? "text-[#22c55e]"
                      : accuracy >= 50
                        ? "text-gold"
                        : "text-coral"
                  }`}
                >
                  {accuracy}% match
                </div>
              )}
            </div>
          )}

          {/* Self-grade */}
          <div className="grid grid-cols-4 gap-1.5">
            {GRADES.map(({ grade, label, emoji, bg, color }) => {
              const selected = audioGrade === grade;
              return (
                <button
                  key={grade}
                  onClick={() => selfGrade(grade)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-bold transition active:scale-95 ${
                    selected ? "ring-2 ring-offset-2 ring-offset-white" : "hover:opacity-80"
                  }`}
                  style={{
                    background: bg,
                    color,
                    // @ts-expect-error css var
                    "--tw-ring-color": color,
                  }}
                >
                  <span className="text-lg">{emoji}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Continue ─────────────────────────────────────────────────── */}
      <button
        onClick={handleContinue}
        disabled={bestGrade() === null}
        className={`btn w-full ${
          bestGrade() !== null
            ? "btn-gold"
            : "bg-surface-2 text-ink-3 cursor-not-allowed opacity-60"
        }`}
      >
        {bestGrade() === null ? "Try one of the options to continue" : "Continue →"}
      </button>
    </div>
  );
}

// ── Jaro similarity for short strings ────────────────────────────────────
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
