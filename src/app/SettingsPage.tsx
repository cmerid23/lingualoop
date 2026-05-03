import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import {
  LANGUAGES,
  scriptClass,
  targetOptions,
  type LangCode,
} from "../data/languages";
import { useSettingsStore } from "../store/settingsStore";
import { useAuthStore } from "../store/authStore";
import { db } from "../data/db";

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore((s) => s.settings);
  const save = useSettingsStore((s) => s.save);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!settings) return null;
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

  const targets = targetOptions(cur.nativeLang);

  return (
    <AppShell title="Languages">
      <div className="px-6 py-8 lg:px-9">
        {/* ── Native language card (read-only summary) ── */}
        <div className="card mb-6">
          <div className="card-label">Native language</div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-3xl">{LANGUAGES[cur.nativeLang].flag}</span>
            <div>
              <div className="font-display text-lg font-semibold">
                {LANGUAGES[cur.nativeLang].name}
              </div>
              <div className={`text-sm font-light text-ink-3 ${scriptClass(cur.nativeLang)}`}>
                {LANGUAGES[cur.nativeLang].nativeName}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs font-light text-ink-3">
            Changing this requires resetting — for now use Reset below.
          </p>
        </div>

        {/* ── Target language grid (lang-card style) ── */}
        <h2 className="card-label mb-3">Target language</h2>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {targets.map((meta) => {
            const isSel = meta.code === cur.targetLang;
            return (
              <button
                key={meta.code}
                onClick={() => changeTarget(meta.code)}
                className={`group relative overflow-hidden rounded-3xl border-2 bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-soft ${
                  isSel
                    ? "border-teal"
                    : "border-surface-2 hover:border-gold"
                }`}
                style={
                  isSel
                    ? { background: "rgba(46,196,182,0.04)" }
                    : undefined
                }
              >
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, transparent 60%, rgba(200,151,58,0.05))",
                  }}
                />
                {isSel && (
                  <span
                    className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: "var(--teal)" }}
                  >
                    ✓
                  </span>
                )}
                <span className="relative block text-[40px]">{meta.flag}</span>
                <div className="relative mt-3.5">
                  <div className="font-display text-lg font-semibold">{meta.name}</div>
                  <div className={`mt-1 text-[13px] font-light text-ink-3 ${scriptClass(meta.code)}`}>
                    {meta.nativeName}
                  </div>
                </div>
                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-3">
                    🔊 {meta.ttsReliable ? "Native TTS" : "Chrome TTS"}
                  </span>
                  {meta.sttReliable && (
                    <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-3">
                      🎙️ STT
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Daily goal ── */}
        <h2 className="card-label mb-3">Daily goal</h2>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {([5, 10, 20] as const).map((m) => {
            const isSel = cur.dailyMinutes === m;
            return (
              <button
                key={m}
                onClick={() => changeMinutes(m)}
                className={`rounded-2xl px-4 py-5 text-center font-bold transition ${
                  isSel
                    ? "bg-ink text-white shadow-soft"
                    : "bg-white border border-surface-2 text-ink hover:border-ink-3"
                }`}
              >
                <div className="font-display text-2xl">{m}</div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wider opacity-70">min/day</div>
              </button>
            );
          })}
        </div>

        {/* ── Account ── */}
        {user && (
          <div className="card mb-4">
            <div className="card-label">Account</div>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  background: "linear-gradient(135deg, var(--teal), var(--violet))",
                }}
              >
                <span className="text-sm font-bold">
                  {(user.fullName?.[0] ?? user.email[0] ?? "U").toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-semibold">
                  {user.fullName ?? user.email}
                </div>
                <div className="truncate text-xs font-light text-ink-3">
                  {user.email}
                  {user.role === "admin" && (
                    <span className="ml-2 rounded-full bg-violet/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn-ghost mt-4 w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        )}

        {/* ── Reset ── */}
        <div className="card">
          <div className="card-label">Reset</div>
          <p className="mt-2 text-sm font-light text-ink-3">
            This erases all your local progress and starts fresh. There's no
            cloud backup yet.
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => navigate(-1)} className="btn-ghost">
              Back
            </button>
            <button onClick={resetAll} className="btn-danger">
              Reset everything
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
