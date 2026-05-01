# LinguaLoop

A multilingual, AI-tutored language-learning PWA.
Phase 1 ships fully offline-capable. Phase 2 layers on Supabase auth + sync.

**Languages (bidirectional, all 20 pairs):** English, Spanish, French, Amharic, Tigrinya.

---

## What's in this Sprint 1 cut

- ✅ Vite + React 18 + TypeScript (strict)
- ✅ Tailwind CSS with brand palette + Geʽez (Amharic/Tigrinya) font fallbacks
- ✅ PWA: installable, offline app shell, theme color, maskable icon
- ✅ Dexie schema with versioned migrations (`settings`, `lessons`, `cards`, `reviews`, `progress`)
- ✅ Onboarding: 4-step wizard (native lang → target lang → goal → daily minutes)
- ✅ Home: daily progress ring, streak, level/XP, language pair card
- ✅ TTS pronunciation preview using Web Speech API (with graceful "no voice" fallback for am/ti)
- ✅ Settings: change target language, daily goal, full reset
- ✅ Hand-authored seed lesson "Hello & Goodbye" loaded for 8 English-paired routes
- ✅ Netlify config + SPA fallback

**Not yet (next sprints):** lesson runner, AI tutor (Claude), STT, SRS reviews, picture associations, sentence builder.

---

## Run it

```bash
pnpm install
cp .env.example .env.local
# (Phase 1 works without any keys — they're only needed in Sprint 3 onward)
pnpm dev
```

Open http://localhost:5173. To test the PWA install + offline behavior, run `pnpm build && pnpm preview`.

---

## Project layout

```
src/
├── app/            # Onboarding, Home, SettingsPage, App, routes
├── components/
│   ├── layout/     # AppShell (top bar, streak)
│   └── ui/         # Button, Card, ProgressRing
├── data/
│   ├── db.ts       # Dexie schema (single source of truth)
│   ├── languages.ts# Language registry
│   └── seed/       # Hand-authored A1 U1 L1 across 8 pairs
├── lib/
│   ├── tts.ts      # Web Speech wrapper, voice picker
│   └── useSpeak.ts # React hook
├── store/          # Zustand stores (settings, progress)
└── styles/         # globals.css
```

---

## Pronunciation strategy

- **English / Spanish / French:** Web Speech API works flawlessly. No cost.
- **Amharic / Tigrinya:** Voices ship with **Chrome on Android** and some Edge installs. Safari/Firefox typically have nothing for these. The TTS layer (`src/lib/tts.ts`) detects this, returns `degraded: true`, and the UI surfaces a one-time tip ("Best on Chrome / install language pack").
- **STT:** Browser STT for am/ti is poor. Sprint 4 will gate the recording activity to en/es/fr only and offer a "type instead" path for am/ti, with optional ElevenLabs Scribe behind a user-supplied key.

---

## Phase 2 upgrade path (don't do this yet)

The two files you'll swap when going full-stack:

1. **`src/data/db.ts`** — add a sync layer that pushes Dexie writes to Supabase and pulls authoritative state on auth.
2. **`src/lib/claude.ts`** *(coming in Sprint 3)* — switch from browser SDK (`dangerouslyAllowBrowser: true`) to a `fetch` against a Supabase Edge Function that proxies Anthropic.

Everything else (UI, lesson runner, SRS) is backend-agnostic.

---

## Replacing placeholder assets

The icons in `public/icons/` are flat blue squares with a white "L". Replace with your real brand assets at the same dimensions (192×192, 512×512, 512×512 maskable). The `favicon.svg` is also a placeholder.
