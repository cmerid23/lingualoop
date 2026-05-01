import { useEffect, useState } from "react";
import { Volume2, RotateCcw } from "lucide-react";
import type { PhraseItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { scriptClass } from "../../data/languages";
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

export function SentenceBuild({
  phrase,
  targetLang,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nativeLang: _nativeLang,
  onResult,
}: SentenceBuildProps) {
  const { speak, speaking } = useSpeak();
  const [bank, setBank] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);

  const tokens = phrase.tgt
    .replace(/[።?!¿]/g, "")
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

  const buildAreaClass =
    result === "correct"
      ? "border-[#22c55e] bg-[rgba(34,197,94,0.04)]"
      : result === "wrong"
        ? "border-coral bg-[rgba(255,107,107,0.04)]"
        : built.length > 0
          ? "border-teal border-solid"
          : "border-surface-3 border-dashed";

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Prompt */}
      <div className="rounded-[20px] border border-surface-2 bg-white px-6 py-5 shadow-soft">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-gold">
          Translate
        </div>
        <p className="mt-2 text-lg font-medium text-ink">{phrase.src}</p>
      </div>

      {/* Build area */}
      <div
        className={`flex min-h-[72px] flex-wrap items-center gap-2 rounded-[20px] border-2 bg-white px-4 py-3.5 transition ${buildAreaClass}`}
        aria-label="Your answer"
      >
        {built.length === 0 ? (
          <span className="text-sm text-ink-3 opacity-40">
            Tap words below to build…
          </span>
        ) : (
          built.map((word, i) => (
            <button
              key={`${word}-${i}`}
              onClick={() => removeWord(word, i)}
              disabled={result !== null}
              className={`animate-pop-in rounded-full px-4 py-2 text-sm font-medium text-white transition active:scale-95 ${scriptClass(targetLang)} ${
                result === "correct"
                  ? "bg-[#22c55e]"
                  : result === "wrong"
                    ? "bg-coral"
                    : "bg-ink hover:bg-ink-2 hover:scale-105"
              }`}
            >
              {word}
            </button>
          ))
        )}
      </div>

      {/* Wrong answer reveal */}
      {result === "wrong" && (
        <div className="text-center">
          <p className={`text-ink ${scriptClass(targetLang)}`}>
            Correct: <span className="font-bold">{phrase.tgt}</span>
          </p>
          {phrase.translit && (
            <p className="mt-1 text-sm italic text-ink-3">{phrase.translit}</p>
          )}
        </div>
      )}

      {/* Word bank */}
      <div className="flex flex-col items-center gap-2.5">
        <div className="w-full text-center text-[11px] font-bold uppercase tracking-[2px] text-ink-3 opacity-40">
          Word bank
        </div>
        <div className="flex w-full flex-wrap justify-center gap-2">
          {bank.map((word, i) => (
            <button
              key={`${word}-${i}`}
              onClick={() => addWord(word, i)}
              disabled={result !== null}
              className={`animate-pop-in rounded-full border-2 border-surface-2 bg-white px-4 py-2 text-sm font-medium text-ink shadow-soft transition active:scale-95 hover:border-ink-3 ${scriptClass(targetLang)}`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button onClick={reset} disabled={result !== null} className="btn-ghost">
          <RotateCcw className="mr-1 h-4 w-4" />
          Reset
        </button>
        <button onClick={handleListen} disabled={speaking} className="btn-ghost">
          <Volume2 className="mr-1 h-4 w-4" />
          Hear it
        </button>
        <button
          onClick={check}
          disabled={!isComplete || result !== null}
          className={`btn flex-1 ${isComplete && result === null ? "btn-teal" : "bg-surface-2 text-ink-3"}`}
        >
          Check
        </button>
      </div>
    </div>
  );
}
