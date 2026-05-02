import { useState } from "react";
import { Volume2, MessagesSquare, Eye, EyeOff, ChevronRight } from "lucide-react";
import type { Dialogue } from "../../data/db";
import type { LangCode } from "../../data/languages";
import { LANGUAGES, scriptClass } from "../../data/languages";
import { useSpeak } from "../../lib/useSpeak";

interface ConversationPracticeProps {
  dialogue: Dialogue;
  targetLang: LangCode;
  nativeLang: LangCode;
  /** Opens the tutor drawer pre-loaded with a roleplay primer for this scenario. */
  onPracticeWithTutor: (scenarioHint: string) => void;
  onContinue: () => void;
}

/**
 * Reading + listening practice for a short dialogue. Each turn renders as a
 * chat bubble alternating sides; tap to play audio, toggle translation.
 * The "Practice with tutor" button hands off to the tutor drawer for
 * free-form roleplay using the same scenario.
 */
export function ConversationPractice({
  dialogue,
  targetLang,
  nativeLang,
  onPracticeWithTutor,
  onContinue,
}: ConversationPracticeProps) {
  const { speak, speaking } = useSpeak();
  const [showAll, setShowAll] = useState(false);
  const targetCls = scriptClass(targetLang);
  const nativeMeta = LANGUAGES[nativeLang];
  const targetMeta = LANGUAGES[targetLang];

  async function playAll() {
    for (const turn of dialogue.turns) {
      await speak(turn.tgt, targetLang);
    }
  }

  function buildScenarioHint(): string {
    return `Roleplay scenario: ${dialogue.scenario}. Speak ${targetMeta.name} to me. Stay in character. Use only vocabulary appropriate for the lesson level. Translate or correct gently when I make mistakes.`;
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Scenario header */}
      <div className="card flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-violet"
          style={{ background: "rgba(124,58,237,0.1)" }}
        >
          <MessagesSquare className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="card-label">Conversation</div>
          <h3 className="font-display text-base font-semibold leading-tight">
            {dialogue.scenario}
          </h3>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          aria-pressed={showAll}
          className="flex h-9 items-center gap-1.5 rounded-full border border-surface-3 bg-white px-3 text-xs font-semibold text-ink-3 hover:bg-surface-2"
        >
          {showAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showAll ? "Hide translations" : "Show translations"}
        </button>
      </div>

      {/* Dialogue bubbles */}
      <div className="flex flex-col gap-3">
        {dialogue.turns.map((turn, i) => {
          const isA = turn.speaker === "A";
          return (
            <div
              key={i}
              className={`flex w-full ${isA ? "justify-start" : "justify-end"}`}
            >
              <div className="flex max-w-[85%] flex-col gap-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[2px] ${isA ? "text-ink-3" : "text-gold"} ${isA ? "text-left" : "text-right"}`}
                >
                  {isA ? `Speaker · ${targetMeta.flag}` : `You · ${nativeMeta.flag}`}
                </span>
                <div
                  className={`relative px-4 py-3 text-sm leading-relaxed ${
                    isA
                      ? "self-start rounded-[4px_18px_18px_18px] bg-white border border-surface-2 text-ink shadow-soft"
                      : "self-end rounded-[18px_4px_18px_18px] text-white"
                  }`}
                  style={
                    isA
                      ? undefined
                      : { background: "linear-gradient(135deg, var(--gold), var(--gold-light))", color: "var(--ink)" }
                  }
                >
                  <div className={`font-medium ${targetCls}`}>{turn.tgt}</div>
                  {turn.translit && (
                    <div className={`mt-0.5 text-xs italic ${isA ? "text-ink-3" : "text-ink/70"}`}>
                      {turn.translit}
                    </div>
                  )}
                  {showAll && (
                    <div
                      className={`mt-1.5 text-xs font-light ${isA ? "text-ink-3" : "text-ink/80"}`}
                    >
                      {turn.src}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => speak(turn.tgt, targetLang)}
                    disabled={speaking}
                    aria-label="Play"
                    className={`absolute -bottom-2 ${isA ? "right-3" : "left-3"} flex h-7 w-7 items-center justify-center rounded-full border border-surface-3 bg-white text-ink-3 shadow-soft transition hover:bg-surface-2 disabled:opacity-50`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={playAll}
          disabled={speaking}
          className="btn-ghost flex-1"
        >
          <Volume2 className="mr-2 h-4 w-4" />
          {speaking ? "Playing…" : "Play full conversation"}
        </button>
        <button
          onClick={() => onPracticeWithTutor(buildScenarioHint())}
          className="btn-violet flex-1"
        >
          <MessagesSquare className="mr-2 h-4 w-4" />
          Practice with tutor
        </button>
      </div>

      <button onClick={onContinue} className="btn-gold w-full">
        Continue
        <ChevronRight className="ml-1 h-4 w-4" />
      </button>
    </div>
  );
}
