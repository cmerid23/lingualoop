import { useEffect, useState } from "react";
import { Volume2, CheckCircle, RotateCcw } from "lucide-react";
import type { PhraseItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { scriptClass } from "../../data/languages";
import { Button } from "../ui/Button";
import { useSpeak } from "../../lib/useSpeak";

interface SentenceBuildProps {
  phrase: PhraseItem;
  targetLang: LangCode;
  nativeLang: LangCode;
  onResult: (correct: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Activity 4: Sentence Builder
 *
 * Tap word tiles in the bank to assemble the target-language sentence.
 * The source-language phrase acts as the prompt.
 * Works for all scripts including Geʽez.
 */
export function SentenceBuild({
  phrase,
  targetLang,
  nativeLang,
  onResult,
}: SentenceBuildProps) {
  const { speak, speaking } = useSpeak();
  const [bank, setBank] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  // Tokenize the target sentence into words (handles Geʽez spaces fine)
  const tokens = phrase.tgt
    .replace(/[።?!¿]/g, "") // strip punctuation for matching
    .split(/\s+/)
    .filter(Boolean);

  useEffect(() => {
    setBank(shuffle(tokens));
    setBuilt([]);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrase.tgt]);

  function addWord(word: string, bankIdx: number) {
    if (result) return;
    setBuilt((b) => [...b, word]);
    setBank((bk) => bk.filter((_, i) => i !== bankIdx));
  }

  function removeWord(word: string, builtIdx: number) {
    if (result) return;
    setBuilt((b) => b.filter((_, i) => i !== builtIdx));
    setBank((bk) => [...bk, word]);
  }

  function check() {
    const answer = built.join(" ").toLowerCase().trim();
    const correct = tokens.join(" ").toLowerCase().trim();
    const isCorrect = answer === correct;
    setResult(isCorrect ? "correct" : "wrong");
    setTimeout(() => onResult(isCorrect), 1400);
  }

  function reset() {
    setBank(shuffle(tokens));
    setBuilt([]);
    setResult(null);
  }

  async function handleListen() {
    await speak(phrase.tgt, targetLang);
  }

  const isComplete = built.length === tokens.length;
  const resultBg =
    result === "correct"
      ? "bg-green-50 ring-green-400 dark:bg-green-950"
      : result === "wrong"
        ? "bg-red-50 ring-red-400 dark:bg-red-950"
        : "bg-slate-100 dark:bg-slate-800 ring-slate-200 dark:ring-slate-700";

  return (
    <div className="flex flex-col gap-5 py-4">
      {/* Prompt in native language */}
      <div className="rounded-xl bg-brand-50 dark:bg-brand-950 px-4 py-3 text-center ring-1 ring-brand-200 dark:ring-brand-800">
        <p className="text-xs text-brand-500 mb-1 font-medium">Translate this</p>
        <p className="text-lg font-semibold">{phrase.src}</p>
      </div>

      {/* Built sentence area */}
      <div
        className={`min-h-[64px] rounded-xl px-4 py-3 ring-2 transition ${resultBg} flex flex-wrap gap-2 items-center`}
        aria-label="Your answer"
      >
        {built.length === 0 ? (
          <span className="text-slate-400 text-sm">Tap words below to build the sentence</span>
        ) : (
          built.map((word, i) => (
            <button
              key={`${word}-${i}`}
              onClick={() => removeWord(word, i)}
              disabled={result !== null}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${scriptClass(targetLang)}
                ${result === "correct"
                  ? "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100"
                  : result === "wrong"
                    ? "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100"
                    : "bg-white dark:bg-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600"
                }`}
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Result message */}
      {result === "correct" && (
        <div className="text-center text-green-700 dark:text-green-300 font-semibold">
          <CheckCircle className="inline mr-1 h-5 w-5" />
          Correct! 🎉
        </div>
      )}
      {result === "wrong" && (
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-1">Not quite.</p>
          <p className={`text-slate-700 dark:text-slate-200 ${scriptClass(targetLang)}`}>
            Correct: <span className="font-bold">{phrase.tgt}</span>
          </p>
          {phrase.translit && (
            <p className="text-sm text-slate-500 italic">{phrase.translit}</p>
          )}
        </div>
      )}

      {/* Word bank */}
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
          Word bank
        </p>
        <div className="flex flex-wrap gap-2">
          {bank.map((word, i) => (
            <button
              key={`${word}-${i}`}
              onClick={() => addWord(word, i)}
              disabled={result !== null}
              className={`rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold shadow-sm transition active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-700 ${scriptClass(targetLang)}`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={reset} disabled={result !== null}>
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </Button>
        <Button
          variant="ghost"
          onClick={handleListen}
          disabled={speaking}
        >
          <Volume2 className="mr-1 h-4 w-4" />
          Hear it
        </Button>
        <Button
          onClick={check}
          disabled={!isComplete || result !== null}
          className="flex-1"
        >
          Check
        </Button>
      </div>
    </div>
  );
}
