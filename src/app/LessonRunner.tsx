import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import type { Lesson, VocabItem } from "../data/db";
import { db, pairKey } from "../data/db";
import { getOrCreateCard, applyGrade } from "../lib/srs";
import { generateLesson } from "../lib/generateLesson";
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
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          {generating && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Generating lesson with AI…
            </p>
          )}
        </div>
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Lesson not found. It may not have been generated yet.
          </p>
          <Button onClick={() => navigate("/")}>Back to home</Button>
        </div>
      </AppShell>
    );
  }

  if (finished) {
    return <LessonComplete
      xpEarned={xpEarned}
      total={totalSteps}
      correct={correctCount}
      onHome={() => navigate("/")}
    />;
  }

  return (
    <AppShell>
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Exit lesson"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {/* Progress bar */}
        <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-slate-500 tabular-nums">
          {cursor + 1}/{totalSteps}
        </span>
      </div>

      {/* Activity label */}
      <div className="mb-3 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-medium text-center">
        {currentActivity?.type === "picture" && "Picture Association"}
        {currentActivity?.type === "sound" && "Listen & Choose"}
        {currentActivity?.type === "pronunciation" && "Pronunciation Drill"}
        {currentActivity?.type === "sentence" && "Build a Sentence"}
      </div>

      {/* Active activity */}
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
    <AppShell>
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          <Trophy className="h-12 w-12 text-brand-600 dark:text-brand-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Lesson complete!</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Great work. Keep up the streak.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          <Stat label="XP earned" value={`+${xpEarned}`} color="text-brand-600 dark:text-brand-300" />
          <Stat label="Accuracy" value={`${pct}%`} color={pct >= 70 ? "text-green-600" : "text-amber-600"} />
          <Stat label="Questions" value={String(total)} color="text-slate-700 dark:text-slate-300" />
        </div>

        <Button fullWidth onClick={onHome}>
          Back to home
        </Button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 py-4">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}
