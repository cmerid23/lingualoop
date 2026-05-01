import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, Heart, Plane, Smile, Trophy } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  ALL_LANG_CODES,
  LANGUAGES,
  scriptClass,
  targetOptions,
  type LangCode,
} from "../data/languages";
import { useSettingsStore } from "../store/settingsStore";

type Goal = "travel" | "heritage" | "work" | "exam" | "fun";
type Minutes = 5 | 10 | 20;

const GOALS: { value: Goal; label: string; sub: string; icon: typeof Plane }[] = [
  { value: "travel", label: "Travel", sub: "Get around comfortably abroad.", icon: Plane },
  { value: "heritage", label: "Family & heritage", sub: "Connect with your roots.", icon: Heart },
  { value: "work", label: "Work", sub: "Use the language professionally.", icon: Briefcase },
  { value: "exam", label: "Exam prep", sub: "Pass a CEFR or proficiency test.", icon: Trophy },
  { value: "fun", label: "Just for fun", sub: "Enjoy the journey.", icon: Smile },
];

const MINUTES: Minutes[] = [5, 10, 20];

export function Onboarding() {
  const navigate = useNavigate();
  const save = useSettingsStore((s) => s.save);

  const [step, setStep] = useState(0);
  const [native, setNative] = useState<LangCode | null>(null);
  const [target, setTarget] = useState<LangCode | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [minutes, setMinutes] = useState<Minutes | null>(null);

  const targets = useMemo(
    () => (native ? targetOptions(native) : []),
    [native],
  );

  const canNext =
    (step === 0 && native !== null) ||
    (step === 1 && target !== null) ||
    (step === 2 && goal !== null) ||
    (step === 3 && minutes !== null);

  async function finish() {
    if (!native || !target || !goal || !minutes) return;
    await save({
      nativeLang: native,
      targetLang: target,
      goal,
      dailyMinutes: minutes,
      cefrLevel: "A1",
    });
    navigate("/", { replace: true });
  }

  function next() {
    if (step === 3) return finish();
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) return;
    setStep((s) => s - 1);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i <= step ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-800"
            }`}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepNative selected={native} onSelect={setNative} />
        )}
        {step === 1 && native && (
          <StepTarget
            selected={target}
            options={targets.map((m) => m.code)}
            onSelect={setTarget}
          />
        )}
        {step === 2 && (
          <StepGoal selected={goal} onSelect={setGoal} />
        )}
        {step === 3 && (
          <StepMinutes selected={minutes} onSelect={setMinutes} />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={back}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={next} disabled={!canNext}>
          {step === 3 ? "Start learning" : "Next"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

function StepNative({
  selected,
  onSelect,
}: {
  selected: LangCode | null;
  onSelect: (c: LangCode) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome to LinguaLoop</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Which language do you speak best? We'll teach in this language.
      </p>
      <div className="mt-6 grid gap-3">
        {ALL_LANG_CODES.map((code) => {
          const meta = LANGUAGES[code];
          const isSel = selected === code;
          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className={`card flex items-center gap-4 text-left transition ${
                isSel ? "ring-2 ring-brand-500" : "hover:ring-brand-200"
              }`}
            >
              <span className="text-3xl" aria-hidden>
                {meta.flag}
              </span>
              <div>
                <div className="font-semibold">{meta.name}</div>
                <div
                  className={`text-sm text-slate-500 dark:text-slate-400 ${scriptClass(code)}`}
                >
                  {meta.nativeName}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepTarget({
  selected,
  options,
  onSelect,
}: {
  selected: LangCode | null;
  options: LangCode[];
  onSelect: (c: LangCode) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">What do you want to learn?</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Pick the language you're studying. You can switch later.
      </p>
      <div className="mt-6 grid gap-3">
        {options.map((code) => {
          const meta = LANGUAGES[code];
          const isSel = selected === code;
          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className={`card flex items-center gap-4 text-left transition ${
                isSel ? "ring-2 ring-brand-500" : "hover:ring-brand-200"
              }`}
            >
              <span className="text-3xl" aria-hidden>
                {meta.flag}
              </span>
              <div className="flex-1">
                <div className="font-semibold">{meta.name}</div>
                <div
                  className={`text-sm text-slate-500 dark:text-slate-400 ${scriptClass(code)}`}
                >
                  {meta.nativeName}
                </div>
              </div>
              {!meta.ttsReliable && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Best on Chrome
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepGoal({
  selected,
  onSelect,
}: {
  selected: Goal | null;
  onSelect: (g: Goal) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">What's your goal?</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        We'll tailor lessons to fit it.
      </p>
      <div className="mt-6 grid gap-3">
        {GOALS.map(({ value, label, sub, icon: Icon }) => {
          const isSel = selected === value;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={`card flex items-center gap-4 text-left transition ${
                isSel ? "ring-2 ring-brand-500" : "hover:ring-brand-200"
              }`}
            >
              <div className="rounded-xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{label}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepMinutes({
  selected,
  onSelect,
}: {
  selected: Minutes | null;
  onSelect: (m: Minutes) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">How much time per day?</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Consistency beats intensity. Pick something you'll actually do.
      </p>
      <div className="mt-6 grid gap-3">
        {MINUTES.map((m) => {
          const isSel = selected === m;
          return (
            <button
              key={m}
              onClick={() => onSelect(m)}
              className={`card flex items-center justify-between text-left transition ${
                isSel ? "ring-2 ring-brand-500" : "hover:ring-brand-200"
              }`}
            >
              <div>
                <div className="font-semibold">{m} minutes</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {m === 5
                    ? "Casual — one quick lesson"
                    : m === 10
                      ? "Steady — recommended for most"
                      : "Serious — measurable progress fast"}
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-500">{m}m</div>
            </button>
          );
        })}
      </div>
      <Card className="mt-6 bg-brand-50 ring-brand-200 dark:bg-brand-950 dark:ring-brand-800">
        <p className="text-sm text-brand-800 dark:text-brand-200">
          You can change all of these any time from settings.
        </p>
      </Card>
    </div>
  );
}
