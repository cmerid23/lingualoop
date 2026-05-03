import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Trophy } from "lucide-react";
import type { SrsCard } from "../data/db";
import { pairKey } from "../data/db";
import { applyGrade, getDueCards } from "../lib/srs";
import { scriptClass } from "../data/languages";
import { useSettingsStore } from "../store/settingsStore";
import { useProgressStore } from "../store/progressStore";
import { AppShell } from "../components/layout/AppShell";
import { SketchImage } from "../components/lesson/SketchImage";
import { Confetti } from "../components/ui/Confetti";

const XP_PER_CARD = 5;
const REVIEW_BATCH_SIZE = 20;

const GRADES = [
  { grade: 1 as const, label: "Again", emoji: "😓", bg: "rgba(255,107,107,0.1)", color: "var(--coral)" },
  { grade: 2 as const, label: "Hard", emoji: "😤", bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
  { grade: 3 as const, label: "Good", emoji: "😊", bg: "rgba(46,196,182,0.1)", color: "var(--teal-dark)" },
  { grade: 4 as const, label: "Easy", emoji: "🎉", bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
];

export function ReviewSession() {
  const settings = useSettingsStore((s) => s.settings);
  const recordActivity = useProgressStore((s) => s.recordActivity);
  const navigate = useNavigate();

  const [cards, setCards] = useState<SrsCard[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [finished, setFinished] = useState(false);

  // Load due cards on mount
  useEffect(() => {
    if (!settings) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    getDueCards(pair, REVIEW_BATCH_SIZE).then(setCards);
  }, [settings]);

  if (!settings) return null;
  const { targetLang } = settings;

  // ── Loading ─────────────────────────────────────────────────────────────
  if (cards === null) {
    return (
      <AppShell bare>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-surface-2 border-t-gold" />
        </div>
      </AppShell>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <AppShell title="Review">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="text-[64px]">🎉</div>
          <h2 className="font-display text-[28px] font-bold leading-tight">
            No reviews due
          </h2>
          <p className="max-w-md text-[15px] font-light text-ink-3">
            All caught up! Come back later when more cards are scheduled, or
            start a lesson to add more cards to your queue.
          </p>
          <button onClick={() => navigate("/home")} className="btn-primary mt-2">
            Back to home
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Completion ──────────────────────────────────────────────────────────
  if (finished) {
    return (
      <AppShell bare>
        <Confetti count={48} />
        <div
          className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(200,151,58,0.08) 0%, transparent 70%)",
          }}
        >
          <div
            className="mb-7 flex h-[120px] w-[120px] items-center justify-center rounded-[36px] border-2 animate-bounce-in"
            style={{
              background: "linear-gradient(135deg, var(--gold-pale), #FFF8E7)",
              borderColor: "rgba(200,151,58,0.2)",
              boxShadow: "0 12px 40px rgba(200,151,58,0.2)",
            }}
          >
            <Trophy className="h-14 w-14 text-gold" />
          </div>
          <h1 className="font-display text-[40px] font-bold leading-tight tracking-tight">
            Review complete!
          </h1>
          <p className="mt-2 text-base font-light text-ink-3">
            Great work strengthening your memory.
          </p>
          <div className="mt-9 flex gap-4">
            <StatBox value={String(reviewedCount)} label="Cards reviewed" />
            <StatBox value={`+${xpEarned}`} label="XP earned" tone="gold" />
          </div>
          <button
            onClick={() => navigate("/home")}
            className="btn-primary mt-9 w-full max-w-xs"
          >
            Back to home
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Active review ───────────────────────────────────────────────────────
  const card = cards[cursor];
  const total = cards.length;
  const progress = cursor / total;

  async function handleGrade(grade: 1 | 2 | 3 | 4) {
    if (!revealed) return;
    await applyGrade(card, grade);
    await recordActivity(XP_PER_CARD, 0);
    setReviewedCount((n) => n + 1);
    setXpEarned((x) => x + XP_PER_CARD);

    const next = cursor + 1;
    if (next >= total) {
      setFinished(true);
    } else {
      setCursor(next);
      setRevealed(false);
    }
  }

  return (
    <AppShell bare>
      {/* Topbar */}
      <div className="flex items-center gap-4 border-b border-surface-3 bg-surface px-6 py-5 lg:px-9">
        <button
          onClick={() => navigate("/home")}
          aria-label="Exit review"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-surface-3 bg-white text-ink-3 transition hover:bg-surface-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, var(--violet), var(--violet-light))",
              }}
            />
          </div>
        </div>
        <span className="whitespace-nowrap text-sm font-semibold text-ink-3 tabular-nums">
          {cursor + 1} / {total}
        </span>
      </div>

      {/* Activity pill */}
      <div className="mt-7 flex justify-center">
        <div className="activity-pill">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--violet)" }} />
          SRS Review
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[620px] flex-col items-center gap-6 px-6 py-8 lg:px-9">
        {/* Flip card */}
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="relative w-full overflow-hidden rounded-[28px] p-12 text-center text-white shadow-lift transition hover:scale-[1.01]"
            style={{ background: "var(--ink)" }}
          >
            <div className="card-label-on-dark mb-6 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Tap to reveal
            </div>
            <div
              className={`font-display text-[52px] font-bold leading-tight tracking-tight text-gold-light ${scriptClass(targetLang)}`}
            >
              {card.tgt}
            </div>
            {card.translit && (
              <div className="mt-2 text-base font-light italic text-white/40">
                {card.translit}
              </div>
            )}
          </button>
        ) : (
          <div className="w-full">
            <div className="card flex flex-col items-center gap-3 py-8">
              <SketchImage word={card.src} size={88} />
              <div className="font-display text-[28px] font-bold leading-tight">
                {card.src}
              </div>
              <div
                className={`text-base font-light text-ink-3 ${scriptClass(targetLang)}`}
              >
                {card.tgt}
                {card.translit && (
                  <span className="ml-2 italic">({card.translit})</span>
                )}
              </div>
            </div>

            <p className="mt-6 mb-3 text-center text-sm font-semibold text-ink">
              How well did you remember it?
            </p>
            <div className="grid grid-cols-4 gap-2.5">
              {GRADES.map(({ grade, label, emoji, bg, color }) => (
                <button
                  key={grade}
                  onClick={() => handleGrade(grade)}
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
      </div>
    </AppShell>
  );
}

function StatBox({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "gold";
}) {
  const valueClr = tone === "gold" ? "text-gold" : "text-ink";
  return (
    <div className="card min-w-[100px] py-5">
      <div className={`font-display text-[30px] font-bold leading-none ${valueClr}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-ink-3">{label}</div>
    </div>
  );
}
