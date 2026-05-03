import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Volume2, Zap } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { UsageBar } from "../components/ui/UsageBar";
import { LANGUAGES, scriptClass } from "../data/languages";
import { db, pairKey } from "../data/db";
import { useSettingsStore } from "../store/settingsStore";
import { useProgressStore } from "../store/progressStore";
import { useAuthStore } from "../store/authStore";
import { useSpeak } from "../lib/useSpeak";
import { fetchUsageToday, type UsageToday } from "../lib/usage";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// 4 lessons × ~8 min/lesson = the proxy threshold for "you've hit today's
// free limit". Replace once we track per-day lesson counts directly.
const FREE_LESSON_PROXY_MINUTES = 4 * 8;

export function Home() {
  const settings = useSettingsStore((s) => s.settings);
  const progress = useProgressStore((s) => s.progress);
  const user = useAuthStore((s) => s.user);
  const { speak, speaking } = useSpeak();
  const navigate = useNavigate();
  const [lessonTitle, setLessonTitle] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageToday | null>(null);

  useEffect(() => {
    if (!settings) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    db.lessons
      .where("[pair+unit+lessonNum]")
      .equals([pair, 1, 1])
      .first()
      .then((row) => setLessonTitle(row?.title ?? null));
  }, [settings]);

  useEffect(() => {
    fetchUsageToday().then(setUsage).catch(() => setUsage(null));
  }, []);

  if (!settings) return null;

  const native = LANGUAGES[settings.nativeLang];
  const target = LANGUAGES[settings.targetLang];
  const minutesPct = Math.min(1, progress.minutesToday / settings.dailyMinutes);
  const xpInLevel = progress.xp % 1000;
  const xpLevelPct = (xpInLevel / 1000) * 100;
  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0

  const helloTarget =
    target.code === "am" || target.code === "ti"
      ? "ሰላም"
      : target.code === "ar"
        ? "مرحبا"
        : target.code === "es"
          ? "hola"
          : target.code === "fr"
            ? "bonjour"
            : "hello";
  const helloTranslit =
    target.code === "am" || target.code === "ti"
      ? "selam"
      : target.code === "ar"
        ? "marhaba"
        : null;

  return (
    <AppShell title={`Good morning, ${user?.fullName?.split(" ")[0] ?? "there"} 👋`}>
      <div className="flex flex-col gap-7 px-6 py-8 lg:px-9">
        {/* ── Hero pair card ── */}
        <div
          className="relative overflow-hidden rounded-[28px] px-10 py-9 text-white"
          style={{ background: "var(--ink)", minHeight: 180 }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-72 w-72"
            style={{
              background:
                "radial-gradient(circle, rgba(200,151,58,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-[40%] h-52 w-52"
            style={{
              background:
                "radial-gradient(circle, rgba(46,196,182,0.1) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex items-center justify-between gap-6">
            <div>
              <h2 className="card-label-on-dark mb-4">Currently learning</h2>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.07] px-5 py-3">
                  <span className="text-[22px]" aria-hidden>{native.flag}</span>
                  <span className="text-sm font-medium">{native.name}</span>
                </div>
                <span className="text-xl text-gold opacity-80">→</span>
                <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.07] px-5 py-3">
                  <span className="text-[22px]" aria-hidden>{target.flag}</span>
                  <span className={`text-sm font-medium ${scriptClass(target.code)}`}>
                    {target.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                onClick={() => navigate("/lesson/1/1")}
                className="btn-gold whitespace-nowrap"
              >
                Continue lesson →
              </button>
              <div className="text-xs font-light text-white/50">
                CEFR <span className="font-semibold text-teal">{settings.cefrLevel}</span> · Unit 1 · Lesson 1
              </div>
            </div>
          </div>
        </div>

        {/* ── Free-plan upgrade nudge ── */}
        {user?.subscriptionPlan === "free" &&
          progress.minutesToday > FREE_LESSON_PROXY_MINUTES && (
            <button
              onClick={() => navigate("/pricing")}
              className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-gold/30 bg-gold-pale px-6 py-5 text-left shadow-soft transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink"
                  style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-light))" }}
                >
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-ink">
                    You've hit today's free limit — upgrade to keep going 🚀
                  </p>
                  <p className="mt-1 text-xs font-light text-ink-3">
                    Pro unlocks unlimited lessons, the AI tutor, and pronunciation scoring.
                  </p>
                </div>
              </div>
              <span className="hidden shrink-0 text-sm font-semibold text-gold sm:inline">
                Upgrade →
              </span>
            </button>
          )}

        {/* ── Stats row: progress ring | level | streak ── */}
        <div className="grid gap-5 md:grid-cols-3">
          <ProgressRingCard
            value={minutesPct}
            minutesToday={progress.minutesToday}
            goal={settings.dailyMinutes}
          />
          <LevelCard level={progress.level} xpInLevel={xpInLevel} pct={xpLevelPct} />
          <StreakCard todayIdx={todayIdx} streakDays={progress.streakDays} />
        </div>

        {/* ── Today's AI usage ── */}
        {usage && (
          <div className="card flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="card-label">Today's AI usage</div>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold capitalize text-ink-3">
                {usage.plan} plan
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageBar
                label="AI Tutor"
                icon="💬"
                used={usage.tutor.used}
                limit={usage.tutor.limit}
              />
              <UsageBar
                label="Lessons"
                icon="📚"
                used={usage.lessons.used}
                limit={usage.lessons.limit}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-light text-ink-3">
              <span>Resets at midnight UTC</span>
              {usage.plan === "free" && (
                <Link
                  to="/pricing"
                  className="font-semibold text-gold hover:underline"
                >
                  Upgrade for more →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom row: due reviews | word of day ── */}
        <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
          <ReviewQueueCard onStart={() => navigate("/lesson/1/1")} dueCount={0} />
          <WordOfDayCard
            tgt={helloTarget}
            translit={helloTranslit}
            srcFlag={native.flag}
            srcMeaning="hello / hi"
            speaking={speaking}
            scriptCls={scriptClass(target.code)}
            onPlay={() => speak(helloTarget, target.code)}
          />
        </div>

        {/* ── Subtle "change pair" link ── */}
        <div className="text-center">
          <Link
            to="/settings"
            className="text-xs font-medium text-ink-3 hover:text-ink underline-offset-4 hover:underline"
          >
            Change language pair
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

// ── Sub-cards ────────────────────────────────────────────────────────────────

function ProgressRingCard({
  value,
  minutesToday,
  goal,
}: {
  value: number;
  minutesToday: number;
  goal: number;
}) {
  const remaining = Math.max(0, goal - minutesToday);
  const headline =
    value >= 1
      ? "Done for today!"
      : value >= 0.5
        ? "Almost there!"
        : value > 0
          ? "Off to a start"
          : "Let's begin";
  const sub =
    value >= 1
      ? "Great work — feel free to keep going."
      : `${remaining} more minute${remaining === 1 ? "" : "s"} to hit your daily target`;

  return (
    <div className="card flex items-center gap-5">
      <RingSvg value={value} minutesToday={minutesToday} goal={goal} />
      <div className="min-w-0">
        <div className="card-label">Today's goal</div>
        <h3 className="mt-2 font-display text-[17px] font-semibold">{headline}</h3>
        <p className="mt-1.5 text-[13px] font-light leading-relaxed text-ink-3">{sub}</p>
      </div>
    </div>
  );
}

function RingSvg({
  value,
  minutesToday,
  goal,
}: {
  value: number;
  minutesToday: number;
  goal: number;
}) {
  const size = 90;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, value)));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--gold)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-[22px] font-bold leading-none text-ink">{minutesToday}</span>
        <span className="mt-1 text-[10px] font-medium text-ink-3/60">/ {goal} min</span>
      </div>
    </div>
  );
}

function LevelCard({ level, xpInLevel, pct }: { level: number; xpInLevel: number; pct: number }) {
  return (
    <div className="card">
      <div className="card-label">Level progress</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-[32px] font-bold">Lv {level}</span>
        <span className="text-[13px] font-light text-ink-3">Scholar</span>
      </div>
      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-[width] duration-1000 ease-out"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--gold), var(--gold-light))",
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-medium text-ink-3">
          <span>{xpInLevel.toLocaleString()} XP</span>
          <span>1,000 XP</span>
        </div>
      </div>
    </div>
  );
}

function StreakCard({ todayIdx, streakDays }: { todayIdx: number; streakDays: number }) {
  return (
    <div className="card">
      <div className="card-label">Weekly streak</div>
      <div className="mt-2 font-display text-[13px] font-medium text-ink-3">
        Mon–Sun · {streakDays} day{streakDays === 1 ? "" : "s"}
      </div>
      <div className="mt-3 flex gap-1.5">
        {DAYS.map((d, i) => {
          const status =
            i < todayIdx ? (i < streakDays ? "done" : "missed") : i === todayIdx ? "today" : "pending";
          return (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ${
                status === "done"
                  ? "text-white"
                  : status === "today"
                    ? "border-2 border-gold bg-gold-pale text-gold"
                    : status === "missed"
                      ? "bg-surface-2 text-ink-3"
                      : "bg-surface-2 text-ink-3"
              }`}
              style={
                status === "done"
                  ? { background: "linear-gradient(135deg, #FF6B35, #FF8C5A)" }
                  : undefined
              }
            >
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewQueueCard({ onStart, dueCount }: { onStart: () => void; dueCount: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-6 text-white shadow-soft"
      style={{ background: "linear-gradient(135deg, var(--teal-dark), var(--teal))" }}
    >
      <div className="card-label-on-dark text-white/60">SRS Review queue</div>
      <h3 className="mt-2 font-display text-[28px] font-bold">{dueCount} words</h3>
      <p className="mt-1 text-[13px] font-light text-white/80">
        {dueCount > 0
          ? "Ready for review — strike while the iron's hot"
          : "All caught up. Start a lesson to add more cards."}
      </p>
      <button
        onClick={onStart}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-5 py-2.5 text-[13px] font-semibold text-white backdrop-blur transition hover:bg-white/30"
      >
        Start reviewing →
      </button>
    </div>
  );
}

function WordOfDayCard({
  tgt,
  translit,
  srcFlag,
  srcMeaning,
  speaking,
  scriptCls,
  onPlay,
}: {
  tgt: string;
  translit: string | null;
  srcFlag: string;
  srcMeaning: string;
  speaking: boolean;
  scriptCls: string;
  onPlay: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-6 text-white shadow-soft"
      style={{ background: "var(--ink-2)" }}
    >
      <div className="card-label-on-dark">Word of the day</div>
      <button
        onClick={onPlay}
        disabled={speaking}
        aria-label="Play word"
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border text-gold-light transition hover:scale-110 disabled:opacity-50"
        style={{
          background: "rgba(200,151,58,0.2)",
          borderColor: "rgba(200,151,58,0.4)",
        }}
      >
        <Volume2 className="h-4 w-4" />
      </button>
      <div className={`mt-2 font-display text-[36px] font-bold leading-tight tracking-tight text-gold-light ${scriptCls}`}>
        {tgt}
      </div>
      {translit && (
        <div className="mt-1 text-sm italic text-white/40">{translit}</div>
      )}
      <div className="mt-2 text-[15px] font-normal text-white/70">
        {srcFlag} {srcMeaning}
      </div>
    </div>
  );
}
