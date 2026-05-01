import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import type { VocabItem } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { LANGUAGES, scriptClass } from "../../data/languages";
import { SketchImage } from "./SketchImage";
import { useSpeak } from "../../lib/useSpeak";

interface PictureAssociationProps {
  item: VocabItem;
  targetLang: LangCode;
  nativeLang: LangCode;
  onContinue: () => void;
}

export function PictureAssociation({
  item,
  targetLang,
  nativeLang,
  onContinue,
}: PictureAssociationProps) {
  const { speak, speaking, warning } = useSpeak();
  const [, setHeard] = useState(false);
  const tgtMeta = LANGUAGES[targetLang];
  const nativeMeta = LANGUAGES[nativeLang];

  useEffect(() => {
    speak(item.tgt, targetLang).then(() => setHeard(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.tgt]);

  async function handleListen() {
    await speak(item.tgt, targetLang);
    setHeard(true);
  }

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {/* Sketch frame */}
      <div
        className="flex h-[200px] w-[200px] items-center justify-center rounded-[28px] border-2 border-surface-2 bg-white animate-float shadow-lift"
      >
        <SketchImage word={item.src} size={140} />
      </div>

      {/* Word display */}
      <div className="text-center">
        <div
          className={`font-display text-[48px] font-bold leading-none tracking-tight text-ink ${scriptClass(targetLang)}`}
        >
          {item.tgt}
        </div>
        {item.translit && (
          <div className="mt-2 text-base font-light italic text-ink-3">
            {item.translit}
          </div>
        )}
        <div className="mt-2.5 text-[15px] font-normal text-ink-3">
          {tgtMeta.flag} → {nativeMeta.flag}{" "}
          <span className="font-medium text-ink">{item.src}</span>
        </div>
      </div>

      {/* Speak button */}
      <button
        onClick={handleListen}
        disabled={speaking}
        aria-label={speaking ? "Playing" : "Play pronunciation"}
        className={`flex h-[60px] w-[60px] items-center justify-center rounded-full border-0 bg-ink text-white shadow-lift transition hover:scale-105 disabled:opacity-50 ${speaking ? "animate-pulse-ring bg-teal" : ""}`}
      >
        <Volume2 className="h-5 w-5" />
      </button>

      {/* TTS warning for am/ti on non-Chrome */}
      {warning && (
        <div
          className="w-full rounded-2xl px-4 py-3 text-sm font-light"
          style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
        >
          🎧 {warning}
        </div>
      )}

      {/* Got it */}
      <button onClick={onContinue} className="btn-primary w-full">
        Got it ✓
      </button>
    </div>
  );
}
