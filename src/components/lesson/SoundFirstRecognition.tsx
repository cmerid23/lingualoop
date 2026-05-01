import { useEffect, useState, useCallback } from "react";
import { Volume2, X, CheckCircle } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { Button } from "../ui/Button";
import { useSpeak } from "../../lib/useSpeak";

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

/**
 * Activity 2: Sound-First Recognition
 *
 * User hears the target word, then picks its native-language meaning
 * from 4 options (1 correct + 3 distractors). Builds listening ear
 * before focusing on reading.
 */
export function SoundFirstRecognition({
  item,
  allItems,
  targetLang,
  nativeLang,
  onResult,
}: SoundFirstProps) {
  const { speak, speaking } = useSpeak();
  const [options, setOptions] = useState<VocabItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const correct = item.src; // native-language answer

  // Build 4 choices: correct + 3 random distractors from the same lesson
  useEffect(() => {
    const others = allItems.filter((v) => v.tgt !== item.tgt);
    const distractors = shuffle(others).slice(0, 3);
    setOptions(shuffle([item, ...distractors]));
    setSelected(null);
    setRevealed(false);
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
    // Short delay before moving on so the result registers visually
    setTimeout(() => onResult(src === correct), 1200);
  }

  function optionStyle(src: string): string {
    if (!revealed) {
      return selected === src
        ? "ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950"
        : "hover:ring-brand-200 hover:bg-slate-50 dark:hover:bg-slate-800";
    }
    if (src === correct) return "ring-2 ring-green-500 bg-green-50 dark:bg-green-950";
    if (src === selected) return "ring-2 ring-red-400 bg-red-50 dark:bg-red-950";
    return "opacity-50";
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Instruction + play button */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Listen and pick the correct meaning
        </p>
        <button
          onClick={handlePlay}
          disabled={speaking}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition active:scale-95 hover:bg-brand-200 disabled:opacity-50 dark:bg-brand-900 dark:text-brand-200"
          aria-label="Play word"
        >
          <Volume2 className="h-10 w-10" />
        </button>
        {/* Reveal the target word text after selection */}
        {revealed && (
          <div className={`text-2xl font-bold ${scriptClass(targetLang)}`}>
            {item.tgt}
            {item.translit && (
              <span className="ml-2 text-base font-normal text-slate-500 italic">
                ({item.translit})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Answer options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.tgt}
            onClick={() => handlePick(opt.src)}
            disabled={revealed}
            className={`card flex flex-col items-center gap-2 p-3 transition ${optionStyle(opt.src)}`}
          >
            <SketchImage word={opt.src} size={72} />
            <span className="text-sm font-semibold text-center">{opt.src}</span>
            {/* Result icon */}
            {revealed && opt.src === correct && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {revealed && opt.src === selected && opt.src !== correct && (
              <X className="h-5 w-5 text-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* If not enough distractors (small lesson), show Continue early */}
      {revealed && options.length < 2 && (
        <Button fullWidth onClick={() => onResult(selected === correct)}>
          Continue
        </Button>
      )}
    </div>
  );
}
