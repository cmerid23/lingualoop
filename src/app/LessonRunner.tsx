import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import type { Lesson, VocabItem } from "../data/db";
import { db, pairKey } from "../data/db";
import { getOrCreateCard, applyGrade } from "../lib/srs";
import { generateLesson } from "../lib/generateLesson";
import { syncToServer } from "../lib/sync";
import { useSettingsStore } from "../store/settingsStore";
import { useProgressStore } from "../store/progressStore";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { PictureAssociation } from "../components/lesson/PictureAssociation";
import { SoundFirstRecognition } from "../components/lesson/SoundFirstRecognition";
import { PronunciationDrill } from "../components/lesson/PronunciationDrill";
import { SentenceBuild } from "../components/lesson/SentenceBuild";
import { TutorDrawer } from "../components/lesson/TutorDrawer";

// ---------------------------------------------------------------------------
// Activity queue builder
// ---------------------------------------------------------------------------
type ActivityType =
  | { type: "picture"; item: VocabItem }
  | { type: "sound"; item: VocabItem }
  | { type: "pronunciation"; item: VocabItem }
  | { type: "sentence"; phraseIdx: number };

function buildQueue(lesson: Lesson): ActivityType[] {
  const queue: ActivityType[] = [];
  const vocab = lesson.vocab;
  const phrases = lesson.phrases;

  // Step 1: Picture association for every vocab item (encode phase)
  for (const item of vocab) {
    queue.push({ type: "picture", item });
  }

  // Step 2: Sound-first recognition — shuffle items
  const shuffled = [...vocab].sort(() => Math.random() - 0.5);
  for (const item of shuffled.slice(0, Math.min(shuffled.length, 5))) {
    queue.push({ type: "sound", item });
  }

  // Step 3: Pronunciation drills — a subset of vocab
  for (const item of vocab.slice(0, Math.min(vocab.length, 4))) {
    queue.push({ type: "pronunciation", item });
  }

  // Step 4: Sentence build — for each phrase in the lesson
  for (let i = 0; i < phrases.length; i++) {
    queue.push({ type: "sentence", phraseIdx: i });
  }

  return queue;
}

// ---------------------------------------------------------------------------
// XP constants
// ---------------------------------------------------------------------------
const XP_CORRECT = 10;
const XP_PARTIAL = 5;
const XP_PICTURE = 5; // always awarded (encode, not test)
const MINUTES_PER_LESSON = 8;

// ---------------------------------------------------------------------------
// LessonRunner
// ---------------------------------------------------------------------------
export function LessonRunner() {
  const { unit, lessonNum } = useParams<{ unit: string; lessonNum: string }>();
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const recordActivity = useProgressStore((s) => s.recordActivity);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState<ActivityType[]>([]);
  const [cursor, setCursor] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  // Load lesson from Dexie; if missing, generate via Claude and cache.
  useEffect(() => {
    if (!settings) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    const u = parseInt(unit ?? "1", 10);
    const l = parseInt(lessonNum ?? "1", 10);

    let cancelled = false;

    (async () => {
      let row = await db.lessons
        .where("[pair+unit+lessonNum]")
        .equals([pair, u, l])
        .first();

      if (!row) {
        if (cancelled) return;
        setGenerating(true);
        try {
          row = await generateLesson(
            pair,
            u,
            l,
            settings.cefrLevel,
            settings.nativeLang,
            settings.targetLang,
          );
        } catch (err) {
          console.error("Failed to generate lesson", err);
          if (cancelled) return;
          setLesson(null);
          setGenerating(false);
          setLoading(false);
          return;
        }
      }

      if (cancelled) return;
      setLesson(row ?? null);
      if (row) setQueue(buildQueue(row));
      setGenerating(false);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [settings, unit, lessonNum]);

  const totalSteps = queue.length;
  const progress = totalSteps > 0 ? cursor / totalSteps : 0;

  const advance = useCallback(
    async (xpDelta: number) => {
      setXpEarned((x) => x + xpDelta);
      const next = cursor + 1;
      if (next >= totalSteps) {
        // Lesson complete
        await recordActivity(xpEarned + xpDelta, MINUTES_PER_LESSON);
        void syncToServer();
        setFinished(true);
      } else {
        setCursor(next);
      }
    },
    [cursor, totalSteps, xpEarned, recordActivity],
  );

  // Handlers per activity type
  async function handlePictureContinue(item: VocabItem) {
    if (!settings || !lesson) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    const card = await getOrCreateCard(pair, item);
    // Picture phase doesn't grade — just ensure card exists
    void card;
    await advance(XP_PICTURE);
  }

  async function handleSoundResult(item: VocabItem, correct: boolean) {
    if (!settings || !lesson) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    const card = await getOrCreateCard(pair, item);
    await applyGrade(card, correct ? 3 : 1);
    if (correct) setCorrectCount((c) => c + 1);
    await advance(correct ? XP_CORRECT : XP_PARTIAL);
  }

  async function handlePronunciationResult(item: VocabItem, grade: 1 | 2 | 3 | 4) {
    if (!settings || !lesson) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    const card = await getOrCreateCard(pair, item);
    await applyGrade(card, grade);
    if (grade >= 3) setCorrectCount((c) => c + 1);
    await advance(grade >= 3 ? XP_CORRECT : XP_PARTIAL);
  }

  async function handleSentenceResult(correct: boolean) {
    if (correct) setCorrectCount((c) => c + 1);
    await advance(correct ? XP_CORRECT : XP_PARTIAL);
  }

  const currentActivity = useMemo(
    () => (queue.length > 0 ? queue[cursor] : null),
    [queue, cursor],
  );

  if (!settings) return null;
  const { nativeLang, targetLang } = settings;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <AppShell bare>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-surface-2 border-t-gold" />
          {generating && (
            <p className="text-sm font-medium text-ink-3">
              Generating lesson with AI…
            </p>
          )}
        </div>
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell bare>
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 py-24 text-center">
          <p className="font-light text-ink-3">
            Lesson not found. It may not have been generated yet.
          </p>
          <Button onClick={() => navigate("/home")}>Back to home</Button>
        </div>
      </AppShell>
    );
  }

  if (finished) {
    return <LessonComplete
      xpEarned={xpEarned}
      total={totalSteps}
      correct={correctCount}
      onHome={() => navigate("/home")}
    />;
  }

  // Activity meta for the pill
  const activityMeta: Record<string, { label: string; dot: string }> = {
    picture: { label: "Picture Association", dot: "var(--gold)" },
    sound: { label: "Listen & Choose", dot: "var(--teal)" },
    pronunciation: { label: "Pronunciation Drill", dot: "var(--coral)" },
    sentence: { label: "Build the Sentence", dot: "var(--violet)" },
  };
  const meta = currentActivity ? activityMeta[currentActivity.type] : null;

  return (
    <AppShell bare>
      {/* Lesson topbar */}
      <div className="flex items-center gap-4 border-b border-surface-3 bg-surface px-6 py-5 lg:px-9">
        <button
          onClick={() => navigate("/home")}
          aria-label="Exit lesson"
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
                background: "linear-gradient(90deg, var(--teal), var(--teal-dark))",
              }}
            />
          </div>
        </div>
        <span className="whitespace-nowrap text-sm font-semibold text-ink-3 tabular-nums">
          {cursor + 1} / {totalSteps}
        </span>
      </div>

      {/* Activity pill */}
      {meta && (
        <div className="mt-7 flex justify-center">
          <div className="activity-pill">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: meta.dot }}
            />
            {meta.label}
          </div>
        </div>
      )}

      {/* Active activity */}
      <div className="mx-auto flex w-full max-w-[620px] flex-col items-center px-6 py-8 lg:px-9">
        {currentActivity?.type === "picture" && (
          <PictureAssociation
            key={`picture-${cursor}`}
            item={currentActivity.item}
            targetLang={targetLang}
            nativeLang={nativeLang}
            onContinue={() => handlePictureContinue(currentActivity.item)}
          />
        )}

        {currentActivity?.type === "sound" && (
          <SoundFirstRecognition
            key={`sound-${cursor}`}
            item={currentActivity.item}
            allItems={lesson.vocab}
            targetLang={targetLang}
            nativeLang={nativeLang}
            onResult={(correct) => handleSoundResult(currentActivity.item, correct)}
          />
        )}

        {currentActivity?.type === "pronunciation" && (
          <PronunciationDrill
            key={`pron-${cursor}`}
            item={currentActivity.item}
            targetLang={targetLang}
            onResult={(grade) => handlePronunciationResult(currentActivity.item, grade)}
          />
        )}

        {currentActivity?.type === "sentence" && lesson.phrases[currentActivity.phraseIdx] && (
          <SentenceBuild
            key={`sentence-${cursor}`}
            phrase={lesson.phrases[currentActivity.phraseIdx]}
            targetLang={targetLang}
            nativeLang={nativeLang}
            onResult={handleSentenceResult}
          />
        )}
      </div>

      <TutorDrawer
        nativeLang={nativeLang}
        targetLang={targetLang}
        level={settings.cefrLevel}
        lessonTitle={lesson.title}
      />
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Lesson complete screen
// ---------------------------------------------------------------------------
function LessonComplete({
  xpEarned,
  total,
  correct,
  onHome,
}: {
  xpEarned: number;
  total: number;
  correct: number;
  onHome: () => void;
}) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

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
            background:
              "linear-gradient(135deg, var(--gold-pale), #FFF8E7)",
            borderColor: "rgba(200,151,58,0.2)",
            boxShadow: "0 12px 40px rgba(200,151,58,0.2)",
          }}
        >
          <Trophy className="h-14 w-14 text-gold" />
        </div>
        <h1 className="font-display text-[40px] font-bold leading-tight tracking-tight">
          Lesson Complete!
        </h1>
        <p className="mt-2 text-base font-light text-ink-3">
          You crushed it. Your progress has been saved.
        </p>

        <div className="mt-9 flex gap-4">
          <StatBox label="XP earned" value={`+${xpEarned}`} variant="gold" />
          <StatBox label="Accuracy" value={`${pct}%`} variant={pct >= 70 ? "green" : "default"} />
          <StatBox label="Questions" value={String(total)} variant="default" />
        </div>

        <button onClick={onHome} className="btn-primary mt-9 w-full max-w-xs">
          Back to home
        </button>
      </div>
    </AppShell>
  );
}

function StatBox({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "gold" | "green" | "default";
}) {
  const valueClr =
    variant === "gold"
      ? "text-gold"
      : variant === "green"
        ? "text-[#22c55e]"
        : "text-ink";
  return (
    <div className="card min-w-[100px] py-5">
      <div className={`font-display text-[30px] font-bold leading-none ${valueClr}`}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-ink-3">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confetti — fires once on the complete screen.
// Each piece gets a random horizontal position, color, size, duration, and
// delay so the burst feels organic rather than uniform.
// ---------------------------------------------------------------------------
const CONFETTI_COLORS = [
  "#C8973A", // gold
  "#F0C96B", // gold-light
  "#2EC4B6", // teal
  "#7C3AED", // violet
  "#FF6B6B", // coral
  "#22C55E", // green
];

function Confetti({ count = 48 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration: 2.6 + Math.random() * 2.2,
        delay: Math.random() * 0.6,
        size: 6 + Math.random() * 6,
      })),
    [count],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => {
        const style: CSSProperties = {
          left: `${p.left}%`,
          top: -10,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: 2,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        };
        return (
          <span
            key={p.id}
            className="absolute animate-confetti-fall"
            style={style}
          />
        );
      })}
    </div>
  );
}
