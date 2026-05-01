import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Volume2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ProgressRing } from "../components/ui/ProgressRing";
import { LANGUAGES, scriptClass } from "../data/languages";
import { db, pairKey } from "../data/db";
import { useSettingsStore } from "../store/settingsStore";
import { useProgressStore } from "../store/progressStore";
import { useSpeak } from "../lib/useSpeak";

export function Home() {
  const settings = useSettingsStore((s) => s.settings);
  const progress = useProgressStore((s) => s.progress);
  const { speak, speaking } = useSpeak();
  const navigate = useNavigate();
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    db.lessons
      .where("[pair+unit+lessonNum]")
      .equals([pair, 1, 1])
      .first()
      .then((row) => setLessonTitle(row?.title ?? null));
  }, [settings]);

  if (!settings) return null; // guarded by router

  const native = LANGUAGES[settings.nativeLang];
  const target = LANGUAGES[settings.targetLang];
  const minutesPct = Math.min(1, progress.minutesToday / settings.dailyMinutes);
  const xpInLevel = progress.xp % 1000;

  const helloTarget = target.code === "am" || target.code === "ti"
    ? "ሰላም"
    : target.code === "es"
      ? "hola"
      : target.code === "fr"
        ? "bonjour"
        : "hello";

  return (
    <AppShell>
      {/* Language pair card */}
      <Card className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Learning
          </div>
          <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>{native.flag}</span>
            <span>{native.name}</span>
            <span className="text-slate-400">→</span>
            <span aria-hidden>{target.flag}</span>
            <span>{target.name}</span>
          </div>
        </div>
        <Link
          to="/settings"
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Change
        </Link>
      </Card>

      {/* Daily target */}
      <Card className="mb-4 flex items-center gap-6">
        <ProgressRing
          value={minutesPct}
          label={`${progress.minutesToday}/${settings.dailyMinutes}`}
          sublabel="min today"
        />
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Today's goal</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {minutesPct >= 1
              ? "🎉 Done for today — keep going if you're feeling it."
              : "Tap below to start your next lesson."}
          </p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="rounded-full bg-brand-100 px-3 py-1 font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              Lv {progress.level}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {xpInLevel} / 1000 XP
            </span>
          </div>
        </div>
      </Card>

      {/* Pronunciation preview — sanity check that TTS works */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hear your first word
            </div>
            <div
              className={`mt-1 text-2xl font-bold ${scriptClass(target.code)}`}
            >
              {helloTarget}
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => speak(helloTarget, target.code)}
            disabled={speaking}
            aria-label="Play pronunciation"
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Continue lesson */}
      <Card>
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <BookOpen className="h-4 w-4" />
          {settings.cefrLevel} · Unit 1 · Lesson 1
        </div>
        <h2 className="text-xl font-bold">
          {lessonTitle ?? "Hello & Goodbye"}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Greetings, polite words, and your first phrases.
        </p>
        <div className="mt-4">
          <Button fullWidth onClick={() => navigate("/lesson/1/1")}>
            Start lesson →
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
