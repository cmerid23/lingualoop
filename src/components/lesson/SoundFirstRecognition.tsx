import { useEffect, useState, useCallback } from "react";
import { Volume2, Type } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { useSpeak } from "../../lib/useSpeak";
import { checkWrittenAnswer } from "../../lib/grading";

const PLACEHOLDERS: Partial<Record<LangCode, string>> = {
  am: "e.g. selam or ሰላም",
  ti: "e.g. selam or ሰላም",
  ar: "e.g. marhaba or مرحبا",
};

interface SoundFirstProps {
  item: VocabItem;
  /** All vocab from the lesson — used to build distractors */
  allItems: VocabItem[];
  targetLang: LangCode;
  nativeLang: LangCode;
  onResult: (correct: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function SoundFirstRecognition({
  item,
  allItems,
  targetLang,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nativeLang: _nativeLang,
  onResult,
}: SoundFirstProps) {
  const { speak, speaking } = useSpeak();
  const [options, setOptions] = useState<VocabItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const correct = item.src;

  // Text fallback state
  const [typed, setTyped] = useState("");
  const [typedResult, setTypedResult] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    const others = allItems.filter((v) => v.tgt !== item.tgt);
    const distractors = shuffle(others).slice(0, 3);
    setOptions(shuffle([item, ...distractors]));
    setSelected(null);
    setRevealed(false);
    setTyped("");
    setTypedResult(null);
    speak(item.tgt, targetLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.tgt]);

  const handlePlay = useCallback(() => {
    speak(item.tgt, targetLang);
  }, [speak, item.tgt, targetLang]);

  function handlePick(src: string) {
    if (revealed) return;
    setSelected(src);
    setRevealed(true);
    setTimeout(() => onResult(src === correct), 1200);
  }

  function checkTyped() {
    if (revealed || typedResult !== null) return;
    const ok = checkWrittenAnswer(typed, item, targetLang);
    setTypedResult(ok ? "correct" : "wrong");
    setRevealed(true);
    setTimeout(() => onResult(ok), 1200);
  }

  const inputScriptCls =
    targetLang === "am" || targetLang === "ti" ? "font-geez" : "";
  const placeholder = PLACEHOLDERS[targetLang] ?? "Type the word…";

  function choiceClass(src: string): string {
    if (!revealed) return "border-surface-2 hover:-translate-y-0.5 hover:border-ink-3";
    if (src === correct) return "border-[#22c55e]";
    if (src === selected) return "border-coral";
    return "opacity-50";
  }
  function choiceBg(src: string): string {
    if (!revealed) return "bg-white";
    if (src === correct) return "bg-[rgba(34,197,94,0.06)]";
    if (src === selected) return "bg-[rgba(255,107,107,0.06)]";
    return "bg-white";
  }

  return (
    <div className="flex w-full flex-col items-center gap-7">
      <p className="text-center text-[15px] font-medium text-ink-3">
        Tap the speaker, then pick the correct meaning
      </p>

      {/* Sound button */}
      <div className="relative">
        <button
          onClick={handlePlay}
          disabled={speaking}
          aria-label="Play word"
          className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-0 bg-ink text-white transition hover:scale-105 disabled:opacity-50"
          style={{ boxShadow: "0 12px 40px rgba(10,10,15,0.25)" }}
        >
          <Volume2 className="h-9 w-9" />
        </button>
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[2px] text-ink-3 opacity-50">
          Tap to hear
        </span>
      </div>

      <div className="h-6" />

      {/* Reveal target word after pick */}
      {revealed && (
        <div className={`text-center font-display text-2xl font-bold ${scriptClass(targetLang)}`}>
          {item.tgt}
          {item.translit && (
            <span className="ml-2 text-base font-normal italic text-ink-3">
              ({item.translit})
            </span>
          )}
        </div>
      )}

      {/* Choices grid */}
      <div className="grid w-full grid-cols-2 gap-3.5">
        {options.map((opt) => (
          <button
            key={opt.tgt}
            onClick={() => handlePick(opt.src)}
            disabled={revealed}
            className={`flex flex-col items-center gap-2.5 rounded-[20px] border-2 p-5 shadow-soft transition ${choiceClass(opt.src)} ${choiceBg(opt.src)}`}
          >
            <SketchImage word={opt.src} size={64} />
            <span className="text-sm font-semibold text-ink">{opt.src}</span>
          </button>
        ))}
      </div>

      {/* Text-input fallback — works whether or not the user clicks a tile */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-center gap-2 text-ink-3">
          <span className="h-px flex-1 bg-surface-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[2px] opacity-60">
            Or type your answer
          </span>
          <span className="h-px flex-1 bg-surface-3" />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={revealed}
            placeholder={placeholder}
            className={`flex-1 rounded-xl border border-surface-3 bg-surface px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink-3 focus:bg-white disabled:opacity-70 ${inputScriptCls}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                checkTyped();
              }
            }}
          />
          <button
            onClick={checkTyped}
            disabled={revealed || typed.trim().length === 0}
            className="btn-teal"
          >
            <Type className="mr-1 h-4 w-4" /> Check
          </button>
        </div>
      </div>

      {revealed && options.length < 2 && (
        <button onClick={() => onResult(selected === correct)} className="btn-primary w-full">
          Continue
        </button>
      )}
    </div>
  );
}
