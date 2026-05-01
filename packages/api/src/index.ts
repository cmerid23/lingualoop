import "dotenv/config";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Anthropic from "@anthropic-ai/sdk";
import pg from "pg";

// ESM doesn't have __dirname natively — shim it so static-asset paths read naturally.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

if (!ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set — /api/tutor and /api/generate-lesson will fail.");
}
if (!JWT_SECRET) {
  console.warn("JWT_SECRET is not set — /api/auth/* and /api/sync/* will fail.");
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const { Pool } = pg;
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
if (!pool) {
  console.warn("DATABASE_URL is not set — auth, sync, and lesson persistence are disabled.");
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
async function ensureSchema() {
  if (!pool) return;
  const schemaPath = fileURLToPath(new URL("./db/schema.sql", import.meta.url));
  const sql = readFileSync(schemaPath, "utf-8");
  await pool.query(sql);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------
const MODELS = {
  cheap: "claude-haiku-4-5",
  smart: "claude-sonnet-4-6",
};

// ---------------------------------------------------------------------------
// Lesson prompt — mirrors src/lib/generateLesson.ts in the frontend exactly.
// ---------------------------------------------------------------------------
type ScriptKind = "latin" | "geez" | "arabic";
const LANG_META: Record<string, { name: string; nativeName: string; script: ScriptKind }> = {
  en: { name: "English", nativeName: "English", script: "latin" },
  es: { name: "Spanish", nativeName: "Español", script: "latin" },
  fr: { name: "French", nativeName: "Français", script: "latin" },
  am: { name: "Amharic", nativeName: "አማርኛ", script: "geez" },
  ti: { name: "Tigrinya", nativeName: "ትግርኛ", script: "geez" },
  ar: { name: "Arabic", nativeName: "العربية", script: "arabic" },
};

const LESSON_SYSTEM_PROMPT =
  "You are a language curriculum author. Respond ONLY with valid JSON matching the schema exactly. No markdown, no backticks, no preamble.";

function buildLessonUserPrompt(
  unit: number,
  lessonNum: number,
  level: string,
  nativeLang: string,
  targetLang: string,
): string {
  const native = LANG_META[nativeLang];
  const target = LANG_META[targetLang];
  const targetIsGeez = target.script === "geez";
  const nativeIsGeez = native.script === "geez";
  const needsTranslit = targetIsGeez || nativeIsGeez;

  return [
    `Write CEFR ${level} Unit ${unit} Lesson ${lessonNum} for a learner whose native language is ${native.name} (${native.nativeName}) studying ${target.name} (${target.nativeName}).`,
    `"src" is the ${native.name} side, "tgt" is the ${target.name} side.`,
    needsTranslit
      ? `Because ${target.name === "Amharic" || target.name === "Tigrinya" ? target.name : native.name} uses the Geʽez script, include a "translit" field (Latin romanization) on every vocab item and phrase that contains Geʽez characters.`
      : `Do not include "translit" — both languages use the Latin script.`,
    `Provide 8 vocab items and 3 phrases appropriate for the unit theme. Each vocab item may include an "imageQuery" string (a 2-5 word visual description in English suitable for a stock-image search). Phrases should be useful sentence-level expressions, not single words.`,
    `Respond with ONLY this JSON object — no other keys, no wrapping:`,
    `{"title": string, "vocab": [{"src": string, "tgt": string, "translit"?: string, "imageQuery"?: string}], "phrases": [{"src": string, "tgt": string, "translit"?: string}]}`,
  ].join("\n\n");
}

function lessonId(pair: string, unit: number, lessonNum: number, schemaVersion = 1): string {
  return `${pair}:${unit}:${lessonNum}:v${schemaVersion}`;
}

// ---------------------------------------------------------------------------
// Tutor prompt
// ---------------------------------------------------------------------------
function buildTutorSystemPrompt(
  nativeLang: string,
  targetLang: string,
  level: string,
  lessonTitle: string,
): string {
  const native = LANG_META[nativeLang]?.name ?? nativeLang;
  const target = LANG_META[targetLang]?.name ?? targetLang;
  return `You are a patient language tutor. The student's native language is ${native} and they are learning ${target} at CEFR level ${level}. Current lesson: ${lessonTitle}. Keep answers to 3 sentences max unless asked for more. Romanize Amharic and Tigrinya when explaining pronunciation.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

interface AuthedRequest extends Request {
  userId?: string;
}

function signToken(userId: string): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET not configured" });
  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireDb(_req: Request, res: Response, next: NextFunction) {
  if (!pool) return res.status(503).json({ error: "Database unavailable" });
  next();
}

// Map a srs_cards row to the frontend SrsCard shape (camelCase + ms timestamps).
function rowToCard(row: any) {
  return {
    id: row.id as string,
    pair: row.pair as string,
    src: row.src as string,
    tgt: row.tgt as string,
    translit: (row.translit ?? undefined) as string | undefined,
    interval: row.interval_days as number,
    easeFactor: Number(row.ease_factor),
    repetitions: row.repetitions as number,
    dueDate: (row.due_date as Date).getTime(),
    lastReviewedAt: row.last_reviewed_at ? (row.last_reviewed_at as Date).getTime() : null,
  };
}

function rowToProgress(row: any) {
  return {
    id: "me" as const,
    xp: row.xp as number,
    level: row.level as number,
    streakDays: row.streak_days as number,
    lastActiveDate: (row.last_active_date ?? "") as string,
    minutesToday: row.minutes_today as number,
    updatedAt: (row.updated_at as Date).getTime(),
  };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Tutor + lesson generation (Anthropic)
// ---------------------------------------------------------------------------
app.post("/api/tutor", async (req: Request, res: Response) => {
  try {
    const { messages, nativeLang, targetLang, level, lessonTitle } = req.body ?? {};
    if (!Array.isArray(messages) || !nativeLang || !targetLang || !level || !lessonTitle) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const response = await anthropic.messages.create({
      model: MODELS.cheap,
      max_tokens: 400,
      system: buildTutorSystemPrompt(nativeLang, targetLang, level, lessonTitle),
      messages,
    });
    res.json({ reply: extractText(response) });
  } catch (err) {
    console.error("/api/tutor failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post("/api/generate-lesson", async (req: Request, res: Response) => {
  try {
    const { pair, unit, lessonNum, level, nativeLang, targetLang } = req.body ?? {};
    if (!pair || unit == null || lessonNum == null || !level || !nativeLang || !targetLang) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!LANG_META[nativeLang] || !LANG_META[targetLang]) {
      return res.status(400).json({ error: "Unsupported language code" });
    }

    const response = await anthropic.messages.create({
      model: MODELS.smart,
      max_tokens: 1500,
      system: LESSON_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildLessonUserPrompt(unit, lessonNum, level, nativeLang, targetLang),
        },
      ],
    });

    const raw = extractText(response);
    let parsed: { title: string; vocab: unknown[]; phrases: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "Claude returned invalid JSON", raw });
    }

    const lesson = {
      id: lessonId(pair, unit, lessonNum, 1),
      pair,
      unit,
      lessonNum,
      level,
      title: parsed.title,
      vocab: parsed.vocab,
      phrases: parsed.phrases,
      source: "ai" as const,
      schemaVersion: 1,
      createdAt: Date.now(),
    };

    if (pool) {
      await pool.query(
        `INSERT INTO lessons (id, pair, unit, lesson_num, level, data, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE
           SET data = EXCLUDED.data,
               source = EXCLUDED.source,
               created_at = NOW()`,
        [lesson.id, pair, unit, lessonNum, level, JSON.stringify(lesson), lesson.source],
      );
    }

    res.json(lesson);
  } catch (err) {
    console.error("/api/generate-lesson failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post("/api/auth/register", requireDb, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Email and password (>= 8 chars) required" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let userId: string;
    try {
      const result = await pool!.query<{ id: string }>(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
        [email.toLowerCase(), passwordHash],
      );
      userId = result.rows[0].id;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
        return res.status(409).json({ error: "Email already registered" });
      }
      throw err;
    }

    res.json({ token: signToken(userId), userId });
  } catch (err) {
    console.error("/api/auth/register failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post("/api/auth/login", requireDb, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool!.query<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ token: signToken(row.id), userId: row.id });
  } catch (err) {
    console.error("/api/auth/login failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ---------------------------------------------------------------------------
// Sync (all require auth + DB)
// ---------------------------------------------------------------------------
app.post("/api/sync/progress", requireDb, requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { xp, level, streakDays, lastActiveDate, minutesToday } = req.body ?? {};
    await pool!.query(
      `INSERT INTO progress (user_id, xp, level, streak_days, last_active_date, minutes_today, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET xp = EXCLUDED.xp,
             level = EXCLUDED.level,
             streak_days = EXCLUDED.streak_days,
             last_active_date = EXCLUDED.last_active_date,
             minutes_today = EXCLUDED.minutes_today,
             updated_at = NOW()`,
      [
        req.userId,
        xp ?? 0,
        level ?? 1,
        streakDays ?? 0,
        lastActiveDate ?? null,
        minutesToday ?? 0,
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("/api/sync/progress failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post("/api/sync/cards", requireDb, requireAuth, async (req: AuthedRequest, res: Response) => {
  const { cards } = req.body ?? {};
  if (!Array.isArray(cards)) {
    return res.status(400).json({ error: "cards must be an array" });
  }

  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    for (const c of cards) {
      await client.query(
        `INSERT INTO srs_cards
           (id, user_id, pair, src, tgt, translit, interval_days, ease_factor, repetitions, due_date, last_reviewed_at)
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           to_timestamp($10::bigint / 1000.0),
           CASE WHEN $11::bigint IS NULL THEN NULL ELSE to_timestamp($11::bigint / 1000.0) END
         )
         ON CONFLICT (id, user_id) DO UPDATE
           SET pair = EXCLUDED.pair,
               src = EXCLUDED.src,
               tgt = EXCLUDED.tgt,
               translit = EXCLUDED.translit,
               interval_days = EXCLUDED.interval_days,
               ease_factor = EXCLUDED.ease_factor,
               repetitions = EXCLUDED.repetitions,
               due_date = EXCLUDED.due_date,
               last_reviewed_at = EXCLUDED.last_reviewed_at`,
        [
          c.id,
          req.userId,
          c.pair,
          c.src,
          c.tgt,
          c.translit ?? null,
          c.interval ?? 1,
          c.easeFactor ?? 2.5,
          c.repetitions ?? 0,
          c.dueDate,
          c.lastReviewedAt ?? null,
        ],
      );
    }
    await client.query("COMMIT");
    res.json({ ok: true, count: cards.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("/api/sync/cards failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    client.release();
  }
});

app.get("/api/sync/pull", requireDb, requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const [progressRes, cardsRes, lessonsRes] = await Promise.all([
      pool!.query(`SELECT * FROM progress WHERE user_id = $1`, [req.userId]),
      pool!.query(`SELECT * FROM srs_cards WHERE user_id = $1`, [req.userId]),
      pool!.query(`SELECT data FROM lessons`),
    ]);

    res.json({
      progress: progressRes.rows[0] ? rowToProgress(progressRes.rows[0]) : null,
      cards: cardsRes.rows.map(rowToCard),
      lessons: lessonsRes.rows.map((r) => r.data),
    });
  } catch (err) {
    console.error("/api/sync/pull failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ---------------------------------------------------------------------------
// Static frontend (production) — serve the Vite build from the workspace root.
// In dev, the frontend is served by `vite` on its own port; this is harmless.
// Path goes up from packages/api/{src|dist}/ to the workspace root, then into dist/.
// ---------------------------------------------------------------------------
const FRONTEND_DIST = path.join(__dirname, "../../../dist");
app.use(express.static(FRONTEND_DIST));
app.get("*", (req, res, next) => {
  // Don't let the SPA fallback swallow unknown /api/* GETs.
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(FRONTEND_DIST, "index.html"));
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
ensureSchema()
  .catch((err) => {
    console.error("Schema init failed (continuing without DB):", err);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`@lingualoop/api listening on :${PORT} (frontend origin: ${FRONTEND_ORIGIN})`);
    });
  });
