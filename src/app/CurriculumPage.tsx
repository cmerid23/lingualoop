import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, Lock, CheckCircle2 } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { CURRICULUM_TREE, type CefrLevel } from "../data/curriculum";
import { db, pairKey } from "../data/db";
import { useSettingsStore } from "../store/settingsStore";

const LEVEL_LABELS: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
};

export function CurriculumPage() {
  const settings = useSettingsStore((s) => s.settings);
  const navigate = useNavigate();
  const [tab, setTab] = useState<CefrLevel>(
    (settings?.cefrLevel as CefrLevel) ?? "A1",
  );
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  // Find which lessons are already cached locally so we can mark them ready.
  useEffect(() => {
    if (!settings) return;
    const pair = pairKey(settings.nativeLang, settings.targetLang);
    db.lessons
      .where("pair")
      .equals(pair)
      .toArray()
      .then((rows) => setCachedIds(new Set(rows.map((r) => r.id))));
  }, [settings]);

  if (!settings) return null;

  const tree = CURRICULUM_TREE.find((l) => l.level === tab)!;

  return (
    <AppShell title="Curriculum">
      <div className="px-6 py-8 lg:px-9">
        {/* Level tabs */}
        <div
          className="mb-7 inline-flex rounded-full p-1"
          style={{ background: "var(--surface-2)" }}
        >
          {(["A1", "A2", "B1"] as CefrLevel[]).map((lvl) => {
            const active = tab === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setTab(lvl)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${
                  active ? "bg-white text-ink shadow-soft" : "text-ink-3 hover:text-ink"
                }`}
              >
                <span className="font-display text-base font-bold">{lvl}</span>
                <span className="text-xs font-light">· {LEVEL_LABELS[lvl]}</span>
              </button>
            );
          })}
        </div>

        {/* Level intro */}
        <div className="mb-6">
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight">
            {tab} · {LEVEL_LABELS[tab]}
          </h2>
          <p className="mt-2 text-[14px] font-light leading-relaxed text-ink-3">
            5 units · 15 lessons. Tap any lesson to start — your progress is
            saved automatically.
          </p>
        </div>

        {/* Units */}
        <div className="space-y-5">
          {tree.units.map((unit) => (
            <UnitCard
              key={unit.unit}
              unit={unit}
              onOpenLesson={(unitNum, lessonNum) =>
                navigate(`/lesson/${unitNum}/${lessonNum}`)
              }
              cachedIds={cachedIds}
              pair={pairKey(settings.nativeLang, settings.targetLang)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function UnitCard({
  unit,
  pair,
  cachedIds,
  onOpenLesson,
}: {
  unit: { unit: number; unitInLevel: number; name: string; lessons: { lessonNum: number; theme: string }[] };
  pair: string;
  cachedIds: Set<string>;
  onOpenLesson: (unit: number, lessonNum: number) => void;
}) {
  const cachedCount = unit.lessons.filter((l) =>
    cachedIds.has(`${pair}:${unit.unit}:${l.lessonNum}:v1`),
  ).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold text-ink"
            style={{ background: "linear-gradient(135deg, var(--gold-pale), #FFF8E7)" }}
          >
            {unit.unitInLevel}
          </div>
          <div>
            <div className="card-label">Unit {unit.unitInLevel}</div>
            <h3 className="font-display text-lg font-semibold leading-tight">
              {unit.name}
            </h3>
          </div>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-ink-3">
          {cachedCount}/{unit.lessons.length} ready
        </span>
      </div>

      <ul className="mt-4 divide-y divide-surface-2">
        {unit.lessons.map((lesson) => {
          const id = `${pair}:${unit.unit}:${lesson.lessonNum}:v1`;
          const cached = cachedIds.has(id);
          return (
            <li key={lesson.lessonNum}>
              <button
                onClick={() => onOpenLesson(unit.unit, lesson.lessonNum)}
                className="group flex w-full items-center gap-3 py-3 text-left transition hover:bg-surface/50"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    cached
                      ? "text-[#22c55e]"
                      : "text-ink-3"
                  }`}
                  style={{
                    background: cached ? "rgba(34,197,94,0.1)" : "var(--surface-2)",
                  }}
                >
                  {cached ? <CheckCircle2 className="h-4 w-4" /> : lesson.lessonNum}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{lesson.theme}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] font-light text-ink-3">
                    <BookOpen className="h-3 w-3" />
                    Lesson {lesson.lessonNum}
                    {!cached && (
                      <>
                        <span className="text-surface-3">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Generates on first open
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
