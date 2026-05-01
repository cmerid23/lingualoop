import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import {
  LANGUAGES,
  scriptClass,
  targetOptions,
  type LangCode,
} from "../data/languages";
import { useSettingsStore } from "../store/settingsStore";
import { db } from "../data/db";

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const save = useSettingsStore((s) => s.save);

  if (!settings) return null;
  // Lock in a non-null reference so closures stay typed correctly.
  const cur = settings;

  async function changeTarget(target: LangCode) {
    await save({ ...cur, targetLang: target });
  }

  async function changeMinutes(m: 5 | 10 | 20) {
    await save({ ...cur, dailyMinutes: m });
  }

  async function resetAll() {
    if (!confirm("Erase all progress and start onboarding over?")) return;
    await db.delete();
    location.href = "/";
  }

  return (
    <AppShell title="Settings">
      <Card className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Native language
        </h2>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-2xl">{LANGUAGES[settings.nativeLang].flag}</span>
          <div>
            <div className="font-semibold">
              {LANGUAGES[settings.nativeLang].name}
            </div>
            <div
              className={`text-sm text-slate-500 dark:text-slate-400 ${scriptClass(settings.nativeLang)}`}
            >
              {LANGUAGES[settings.nativeLang].nativeName}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Changing this is a Phase 2 feature — for now, reset below to switch.
        </p>
      </Card>

      <Card className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Target language
        </h2>
        <div className="mt-3 grid gap-2">
          {targetOptions(settings.nativeLang).map((meta) => {
            const isSel = meta.code === settings.targetLang;
            return (
              <button
                key={meta.code}
                onClick={() => changeTarget(meta.code)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  isSel
                    ? "bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-950"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">{meta.flag}</span>
                <span className="flex-1 font-medium">{meta.name}</span>
                <span
                  className={`text-sm text-slate-500 dark:text-slate-400 ${scriptClass(meta.code)}`}
                >
                  {meta.nativeName}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Daily goal
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([5, 10, 20] as const).map((m) => (
            <button
              key={m}
              onClick={() => changeMinutes(m)}
              className={`rounded-xl px-3 py-3 font-semibold transition ${
                settings.dailyMinutes === m
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Reset
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This erases all your local progress and starts fresh. There's no cloud
          backup yet.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button variant="danger" onClick={resetAll}>
            Reset everything
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
