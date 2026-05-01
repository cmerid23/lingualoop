import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, Heart, Plane, Smile, Trophy } from "lucide-react";
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
    <div
      className="flex min-h-screen items-center justify-center px-6 py-10"
      style={{
        background:
          "radial-gradient(ellipse at 30% 50%, rgba(200,151,58,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(46,196,182,0.06) 0%, transparent 60%), var(--surface)",
      }}
    >
      <div className="w-full max-w-[520px] rounded-[32px] border border-surface-2 bg-white p-12 shadow-lift">
        {/* Step dots */}
        <div className="mb-8 flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 rounded transition-all duration-300 ${
                i === step ? "bg-gold" : i < step ? "bg-teal" : "bg-surface-2"
              }`}
              style={{ flex: i === step ? 2 : 1 }}
            />
          ))}
        </div>

        {step === 0 && <StepNative selected={native} onSelect={setNative} />}
        {step === 1 && native && (
          <StepTarget
            selected={target}
            options={targets.map((m) => m.code)}
            onSelect={setTarget}
          />
        )}
        {step === 2 && <StepGoal selected={goal} onSelect={setGoal} />}
        {step === 3 && <StepMinutes selected={minutes} onSelect={setMinutes} />}

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button onClick={back} className="btn-ghost">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={next}
            disabled={!canNext}
            className="btn-primary"
          >
            {step === 3 ? "Start learning" : "Next"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────────────────────────────────────

function LangOption({
  flag,
  name,
  native,
  scriptCls,
  selected,
  badge,
  onClick,
}: {
  flag: string;
  name: string;
  native: string;
  scriptCls: string;
  selected: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-2.5 flex w-full items-center gap-3.5 rounded-2xl border-2 px-5 py-4 text-left transition ${
        selected
          ? "border-gold bg-gold-pale"
          : "border-surface-2 bg-surface hover:border-ink-3 hover:bg-white"
      }`}
    >
      <span className="text-[26px]" aria-hidden>{flag}</span>
      <div className="flex-1">
        <div className="text-[15px] font-semibold">{name}</div>
        <div className={`mt-0.5 text-xs font-light text-ink-3 ${scriptCls}`}>{native}</div>
      </div>
      {selected && (
        <span className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
          Selected ✓
        </span>
      )}
      {!selected && badge && (
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-3">
          {badge}
        </span>
      )}
    </button>
  );
}

function StepNative({
  selected,
  onSelect,
}: {
  selected: LangCode | null;
  onSelect: (c: LangCode) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-[28px] font-bold leading-tight">What do you speak best?</h2>
      <p className="mt-2 mb-7 text-[15px] font-light leading-relaxed text-ink-3">
        We'll teach everything in your native language so nothing gets lost in translation.
      </p>
      {ALL_LANG_CODES.map((code) => {
        const meta = LANGUAGES[code];
        return (
          <LangOption
            key={code}
            flag={meta.flag}
            name={meta.name}
            native={meta.nativeName}
            scriptCls={scriptClass(code)}
            selected={selected === code}
            onClick={() => onSelect(code)}
          />
        );
      })}
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
      <h2 className="font-display text-[28px] font-bold leading-tight">What do you want to learn?</h2>
      <p className="mt-2 mb-7 text-[15px] font-light leading-relaxed text-ink-3">
        Pick the language you're studying. You can switch later.
      </p>
      {options.map((code) => {
        const meta = LANGUAGES[code];
        return (
          <LangOption
            key={code}
            flag={meta.flag}
            name={meta.name}
            native={meta.nativeName}
            scriptCls={scriptClass(code)}
            selected={selected === code}
            badge={!meta.ttsReliable ? "Best on Chrome" : undefined}
            onClick={() => onSelect(code)}
          />
        );
      })}
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
      <h2 className="font-display text-[28px] font-bold leading-tight">What's your goal?</h2>
      <p className="mt-2 mb-7 text-[15px] font-light leading-relaxed text-ink-3">
        We'll tailor lessons to fit it.
      </p>
      {GOALS.map(({ value, label, sub, icon: Icon }) => {
        const isSel = selected === value;
        return (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={`mb-2.5 flex w-full items-center gap-3.5 rounded-2xl border-2 px-5 py-4 text-left transition ${
              isSel
                ? "border-gold bg-gold-pale"
                : "border-surface-2 bg-surface hover:border-ink-3 hover:bg-white"
            }`}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: isSel
                  ? "rgba(200,151,58,0.2)"
                  : "var(--surface-2)",
                color: isSel ? "var(--gold)" : "var(--ink-3)",
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">{label}</div>
              <div className="mt-0.5 text-xs font-light text-ink-3">{sub}</div>
            </div>
          </button>
        );
      })}
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
      <h2 className="font-display text-[28px] font-bold leading-tight">How much time per day?</h2>
      <p className="mt-2 mb-7 text-[15px] font-light leading-relaxed text-ink-3">
        Consistency beats intensity. Pick something you'll actually do.
      </p>
      {MINUTES.map((m) => {
        const isSel = selected === m;
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className={`mb-2.5 flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition ${
              isSel
                ? "border-gold bg-gold-pale"
                : "border-surface-2 bg-surface hover:border-ink-3 hover:bg-white"
            }`}
          >
            <div>
              <div className="text-[15px] font-semibold">{m} minutes</div>
              <div className="mt-0.5 text-xs font-light text-ink-3">
                {m === 5
                  ? "Casual — one quick lesson"
                  : m === 10
                    ? "Steady — recommended for most"
                    : "Serious — measurable progress fast"}
              </div>
            </div>
            <div className="font-display text-[24px] font-bold text-gold">{m}m</div>
          </button>
        );
      })}
      <div
        className="mt-5 rounded-2xl px-5 py-3 text-sm font-light"
        style={{ background: "var(--gold-pale)", color: "var(--gold)" }}
      >
        You can change all of these any time from settings.
      </div>
    </div>
  );
}
