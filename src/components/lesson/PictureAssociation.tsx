import { useEffect, useState } from "react";
import { Volume2, CheckCircle } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { LANGUAGES, scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { Button } from "../ui/Button";
import { useSpeak } from "../../lib/useSpeak";

interface PictureAssociationProps {
  item: VocabItem;
  targetLang: LangCode;
  nativeLang: LangCode;
  onContinue: () => void;
}

/**
 * Activity 1: Picture Association
 *
 * Show the sketch + target word. User hears the pronunciation.
 * They tap "Got it" to move on. No failure state here — this is pure
 * input/encoding, not testing.
 */
export function PictureAssociation({
  item,
  targetLang,
  nativeLang,
  onContinue,
}: PictureAssociationProps) {
  const { speak, speaking, warning } = useSpeak();
  const [heard, setHeard] = useState(false);
  const tgtMeta = LANGUAGES[targetLang];
  const nativeMeta = LANGUAGES[nativeLang];

  // Auto-play on mount
  useEffect(() => {
    speak(item.tgt, targetLang).then(() => setHeard(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.tgt]);

  async function handleListen() {
    await speak(item.tgt, targetLang);
    setHeard(true);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Sketch */}
      <SketchImage word={item.src} size={148} className="shadow-md" />

      {/* Target word */}
      <div className="text-center">
        <div
          className={`text-4xl font-bold tracking-wide ${scriptClass(targetLang)}`}
        >
          {item.tgt}
        </div>

        {/* Transliteration for Geʽez scripts */}
        {item.translit && (
          <div className="mt-1 text-lg text-slate-500 italic">
            {item.translit}
          </div>
        )}

        {/* Native meaning */}
        <div className="mt-2 text-base text-slate-500 dark:text-slate-400">
          {tgtMeta.flag} → {nativeMeta.flag}{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {item.src}
          </span>
        </div>
      </div>

      {/* TTS warning for am/ti on non-Chrome */}
      {warning && (
        <div className="w-full rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200 ring-1 ring-amber-200">
          🎧 {warning}
        </div>
      )}

      {/* Controls */}
      <div className="flex w-full flex-col gap-3">
        <Button
          variant="ghost"
          fullWidth
          onClick={handleListen}
          disabled={speaking}
        >
          <Volume2 className="mr-2 h-4 w-4" />
          {speaking ? "Playing…" : "Listen again"}
        </Button>

        <Button fullWidth onClick={onContinue}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Got it!
        </Button>
      </div>
    </div>
  );
}
