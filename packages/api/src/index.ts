import "dotenv/config";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import {
  type AuthedRequest,
  generateOTP,
  generateToken,
  hashPassword,
  requireAdmin,
  requireAuth,
  verifyPassword,
} from "./auth.js";
import { pool, requireDb } from "./db.js";
import {
  checkLimit,
  midnightUtcTomorrow,
  todayUtcDate,
} from "./usageMiddleware.js";
import { getLimit } from "./limits.js";
import {
  PLAN_FROM_PRICE,
  STRIPE_WEBHOOK_SECRET,
  cycleFromPrice,
  priceIdFor,
  stripe,
  stripeIsConfigured,
} from "./stripe.js";

// ESM doesn't have __dirname natively — shim it so static-asset paths read naturally.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ??
  (process.env.NODE_ENV === "production"
    ? "https://lingualoop-production.up.railway.app"
    : "http://localhost:5173");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set — /api/tutor and /api/generate-lesson will fail.");
}
if (!JWT_SECRET) {
  console.warn("JWT_SECRET is not set — /api/auth/* and /api/sync/* will fail.");
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Auth rate limiters — protect against brute force + abuse on public auth
// endpoints. Behind a shared trust proxy (Railway) so the limiter sees the
// real client IP rather than the load balancer's.
// ---------------------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_attempts",
    message: "Too many login attempts. Try again in 15 minutes.",
  },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_otp_requests",
    message: "Too many OTP requests. Try again in 1 hour.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_registrations",
    message: "Too many registrations from this IP.",
  },
});

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

/**
 * If the requested lesson is already cached server-side, return it
 * without calling Claude or decrementing the user's daily quota. Runs
 * before requireAuth → checkLimit so curriculum lessons stay free.
 */
async function returnCachedLessonOrNext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!pool || !req.body) return next();
  const { pair, unit, lessonNum } = req.body;
  if (!pair || unit == null || lessonNum == null) return next();
  try {
    const id = lessonId(pair, unit, lessonNum, 1);
    const result = await pool.query<{ data: unknown }>(
      `SELECT data FROM lessons WHERE id = $1`,
      [id],
    );
    if (result.rows[0]) {
      res.json(result.rows[0].data);
      return;
    }
    next();
  } catch (err) {
    console.warn("Lesson cache check failed; falling through to generator", err);
    next();
  }
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

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && EMAIL_RX.test(s);
}

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_started_at: Date | null;
  subscription_ends_at: Date | null;
  cancel_at_period_end: boolean | null;
  stripe_customer_id: string | null;
  streak_days: number;
  total_xp: number;
  native_lang: string;
  target_lang: string;
  cefr_level: string;
  daily_minutes: number;
  last_active_at: Date;
  created_at: Date;
  updated_at: Date;
}

function publicUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    subscriptionPlan: row.subscription_plan,
    subscriptionStatus: row.subscription_status,
    subscriptionStartedAt: row.subscription_started_at,
    subscriptionEndsAt: row.subscription_ends_at,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    stripeCustomerId: row.stripe_customer_id,
    streakDays: row.streak_days,
    totalXp: row.total_xp,
    nativeLang: row.native_lang,
    targetLang: row.target_lang,
    cefrLevel: row.cefr_level,
    dailyMinutes: row.daily_minutes,
    lastActiveAt: row.last_active_at,
  };
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
// Railway sits behind a load balancer; trust the first proxy hop so
// express-rate-limit sees the real client IP instead of 127.0.0.1.
app.set("trust proxy", 1);
app.use(cors({ origin: FRONTEND_ORIGIN }));

// ---------------------------------------------------------------------------
// Stripe webhook — MUST be registered with express.raw() BEFORE the global
// express.json() middleware. Stripe verifies the signature against the raw
// request body bytes; if json parsing has already touched it, verification
// fails with "No signatures found matching the expected signature".
// ---------------------------------------------------------------------------
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    if (!pool) {
      // Always 200 so Stripe doesn't retry forever.
      res.status(200).end();
      return;
    }
    const sig = req.header("stripe-signature") ?? "";
    let event: import("stripe").Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Stripe webhook signature failed", err);
      res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "bad signature"}`);
      return;
    }

    try {
      await handleStripeEvent(event);
    } catch (err) {
      // Log but don't return non-2xx — Stripe will retry forever otherwise.
      console.error(`Stripe webhook handler failed for ${event.type}`, err);
    }
    res.json({ received: true });
  },
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Tutor + lesson generation (Anthropic)
// ---------------------------------------------------------------------------
app.post("/api/tutor", requireDb, requireAuth, checkLimit("tutorMessages"), async (req: Request, res: Response) => {
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

app.post(
  "/api/generate-lesson",
  requireDb,
  requireAuth,
  returnCachedLessonOrNext,
  checkLimit("lessonsGenerated"),
  async (req: Request, res: Response) => {
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
// Usage (today's per-user counts + plan limits)
// ---------------------------------------------------------------------------
app.get(
  "/api/usage/today",
  requireDb,
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const today = todayUtcDate();
      const lookup = await pool!.query<{
        plan: string;
        tutor: string | number;
        lessons: string | number;
      }>(
        `SELECT u.subscription_plan AS plan,
                COALESCE(d.tutor_messages, 0) AS tutor,
                COALESCE(d.lessons_generated, 0) AS lessons
         FROM users u
         LEFT JOIN daily_usage d ON d.user_id = u.id AND d.date = $2
         WHERE u.id = $1`,
        [req.user!.id, today],
      );
      const row = lookup.rows[0];
      if (!row) return res.status(404).json({ error: "User not found" });

      const plan = row.plan;
      const tutorUsed = Number(row.tutor);
      const lessonsUsed = Number(row.lessons);
      // Admins always see unlimited regardless of subscription_plan.
      const isAdmin = req.user!.role === "admin";
      const tutorLimit = isAdmin ? -1 : getLimit(plan, "tutorMessagesPerDay");
      const lessonsLimit = isAdmin ? -1 : getLimit(plan, "lessonsGeneratedPerDay");

      const pack = (used: number, limit: number) =>
        limit === -1
          ? { used, limit: -1, remaining: -1 }
          : { used, limit, remaining: Math.max(0, limit - used) };

      res.json({
        date: today,
        plan,
        tutor: pack(tutorUsed, tutorLimit),
        lessons: pack(lessonsUsed, lessonsLimit),
        resetsAt: midnightUtcTomorrow(),
      });
    } catch (err) {
      console.error("/api/usage/today failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// ---------------------------------------------------------------------------
// Stripe — checkout, portal, subscription view + webhook handler
// ---------------------------------------------------------------------------
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const existing = await pool!.query<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId],
  );
  const existingId = existing.rows[0]?.stripe_customer_id;
  if (existingId) return existingId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  await pool!.query(
    `UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
    [customer.id, userId],
  );
  return customer.id;
}

async function findUserByCustomerId(
  customerId: string,
): Promise<{ id: string; email: string } | null> {
  const r = await pool!.query<{ id: string; email: string }>(
    `SELECT id, email FROM users WHERE stripe_customer_id = $1`,
    [customerId],
  );
  return r.rows[0] ?? null;
}

async function handleStripeEvent(event: import("stripe").Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
      if (!customerId) return;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      if (!subscriptionId) return;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = PLAN_FROM_PRICE[priceId] ?? null;
      if (!plan) {
        console.warn(`Unknown price ID in checkout: ${priceId}`);
        return;
      }
      const periodEnd = new Date(sub.current_period_end * 1000);
      const periodStart = new Date(sub.current_period_start * 1000);
      const amount = sub.items.data[0]?.price.unit_amount ?? 0;
      const currency = (sub.items.data[0]?.price.currency ?? "usd").toUpperCase();

      const userRow = await findUserByCustomerId(customerId);
      if (!userRow) return;

      await pool!.query(
        `UPDATE users
         SET subscription_plan = $1,
             subscription_status = 'active',
             subscription_started_at = $2,
             subscription_ends_at = $3,
             cancel_at_period_end = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [plan, periodStart, periodEnd, sub.cancel_at_period_end, userRow.id],
      );

      await pool!.query(
        `INSERT INTO subscriptions (user_id, plan, status, amount_cents, currency, started_at, ends_at)
         VALUES ($1, $2, 'active', $3, $4, $5, $6)`,
        [userRow.id, plan, amount, currency, periodStart, periodEnd],
      );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userRow = await findUserByCustomerId(customerId);
      if (!userRow) return;

      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = PLAN_FROM_PRICE[priceId];
      const periodEnd = new Date(sub.current_period_end * 1000);

      await pool!.query(
        `UPDATE users
         SET subscription_plan = COALESCE($1, subscription_plan),
             subscription_status = $2,
             subscription_ends_at = $3,
             cancel_at_period_end = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [plan ?? null, sub.status, periodEnd, sub.cancel_at_period_end, userRow.id],
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userRow = await findUserByCustomerId(customerId);
      if (!userRow) return;
      await pool!.query(
        `UPDATE users
         SET subscription_plan = 'free',
             subscription_status = 'cancelled',
             cancel_at_period_end = FALSE,
             updated_at = NOW()
         WHERE id = $1`,
        [userRow.id],
      );
      await pool!.query(
        `UPDATE subscriptions SET cancelled_at = NOW(), status = 'cancelled'
         WHERE user_id = $1 AND cancelled_at IS NULL`,
        [userRow.id],
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;
      if (!customerId) return;
      const userRow = await findUserByCustomerId(customerId);
      if (!userRow) return;
      await pool!.query(
        `UPDATE users SET subscription_status = 'past_due', updated_at = NOW() WHERE id = $1`,
        [userRow.id],
      );
      break;
    }
  }
}

app.post(
  "/api/stripe/create-checkout-session",
  requireDb,
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      if (!stripeIsConfigured()) {
        return res.status(503).json({
          error: "stripe_not_configured",
          message: "Payments are temporarily unavailable. Try again soon.",
        });
      }
      const { plan, billingCycle, priceId: clientPriceId } = req.body ?? {};
      if (plan !== "pro" && plan !== "premium") {
        return res.status(400).json({ error: "Invalid plan" });
      }
      if (billingCycle !== "monthly" && billingCycle !== "annual") {
        return res.status(400).json({ error: "Invalid billing cycle" });
      }

      // Prefer the resolved price ID from server config; accept the
      // client-supplied one only if it matches a known price.
      const resolved = priceIdFor(plan, billingCycle);
      const priceId = resolved
        ?? (typeof clientPriceId === "string" && PLAN_FROM_PRICE[clientPriceId]
          ? clientPriceId
          : null);
      if (!priceId) {
        return res
          .status(503)
          .json({ error: "price_not_configured", message: `No Stripe price for ${plan} ${billingCycle}.` });
      }

      // Need the user's email for the customer record.
      const userQ = await pool!.query<{ email: string }>(
        `SELECT email FROM users WHERE id = $1`,
        [req.user!.id],
      );
      const userEmail = userQ.rows[0]?.email;
      if (!userEmail) return res.status(404).json({ error: "User not found" });

      const customerId = await getOrCreateStripeCustomer(req.user!.id, userEmail);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${FRONTEND_ORIGIN}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_ORIGIN}/payment/cancel`,
        allow_promotion_codes: true,
        metadata: {
          userId: req.user!.id,
          plan,
          billingCycle,
        },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("/api/stripe/create-checkout-session failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.post(
  "/api/stripe/create-portal-session",
  requireDb,
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      if (!stripeIsConfigured()) {
        return res.status(503).json({ error: "stripe_not_configured" });
      }
      const r = await pool!.query<{ stripe_customer_id: string | null }>(
        `SELECT stripe_customer_id FROM users WHERE id = $1`,
        [req.user!.id],
      );
      const customerId = r.rows[0]?.stripe_customer_id;
      if (!customerId) {
        return res.status(400).json({
          error: "no_customer",
          message: "You don't have an active subscription.",
        });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${FRONTEND_ORIGIN}/settings`,
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error("/api/stripe/create-portal-session failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.get(
  "/api/stripe/subscription",
  requireDb,
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    try {
      const r = await pool!.query<{
        subscription_plan: string;
        subscription_status: string;
        subscription_ends_at: Date | null;
        cancel_at_period_end: boolean | null;
        stripe_customer_id: string | null;
      }>(
        `SELECT subscription_plan, subscription_status, subscription_ends_at,
                cancel_at_period_end, stripe_customer_id
         FROM users WHERE id = $1`,
        [req.user!.id],
      );
      const row = r.rows[0];
      if (!row) return res.status(404).json({ error: "User not found" });

      // Default billing cycle from the latest active subscription row.
      let billingCycle: "monthly" | "annual" | null = null;
      if (stripeIsConfigured() && row.stripe_customer_id) {
        try {
          const subs = await stripe.subscriptions.list({
            customer: row.stripe_customer_id,
            status: "all",
            limit: 1,
          });
          const priceId = subs.data[0]?.items.data[0]?.price.id;
          if (priceId) billingCycle = cycleFromPrice(priceId);
        } catch (err) {
          console.warn("Could not list Stripe subscriptions", err);
        }
      }

      res.json({
        plan: row.subscription_plan,
        status: row.subscription_status,
        billingCycle,
        currentPeriodEnd: row.subscription_ends_at,
        cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
        portalUrl: null,
      });
    } catch (err) {
      console.error("/api/stripe/subscription failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// ---------------------------------------------------------------------------
// Waitlist (Stripe stub) — capture interest while payment integration ships.
// ---------------------------------------------------------------------------
app.post("/api/waitlist", requireDb, async (req: Request, res: Response) => {
  try {
    const { email, plan } = req.body ?? {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    await pool!.query(
      `INSERT INTO waitlist (email, plan)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET plan = EXCLUDED.plan`,
      [email.toLowerCase(), typeof plan === "string" ? plan : null],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("/api/waitlist failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post("/api/auth/register", registerLimiter, requireDb, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body ?? {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await pool!.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await pool!.query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        email.toLowerCase(),
        passwordHash,
        typeof fullName === "string" ? fullName : null,
        typeof phone === "string" && phone.length > 0 ? phone : null,
      ],
    );
    const user = inserted.rows[0];
    res.json({
      token: generateToken(user.id, user.role),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        subscriptionPlan: user.subscription_plan,
      },
    });
  } catch (err: any) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return res.status(409).json({ error: "Email or phone already registered" });
    }
    console.error("/api/auth/register failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post("/api/auth/login", loginLimiter, requireDb, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool!.query<UserRow & { password_hash: string }>(
      `SELECT * FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = result.rows[0];
    if (!row) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      token: generateToken(row.id, row.role),
      user: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        subscriptionPlan: row.subscription_plan,
        nativeLang: row.native_lang,
        targetLang: row.target_lang,
        cefrLevel: row.cefr_level,
        streakDays: row.streak_days,
        totalXp: row.total_xp,
      },
    });
  } catch (err) {
    console.error("/api/auth/login failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post("/api/auth/send-otp", otpLimiter, requireDb, async (req: Request, res: Response) => {
  try {
    const { identifier, type } = req.body ?? {};
    if (typeof identifier !== "string" || identifier.length === 0) {
      return res.status(400).json({ error: "identifier required" });
    }
    if (type !== "email" && type !== "phone") {
      return res.status(400).json({ error: "type must be 'email' or 'phone'" });
    }
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool!.query(
      `INSERT INTO otp_codes (identifier, code, type, expires_at) VALUES ($1, $2, $3, $4)`,
      [identifier, code, type, expiresAt],
    );
    // TODO: integrate Resend/Twilio for real delivery
    if (process.env.NODE_ENV !== "production") {
      console.log("[DEV OTP]", identifier, code);
    }
    res.json({
      success: true,
      message: "Code sent. Check your email or phone.",
    });
  } catch (err) {
    console.error("/api/auth/send-otp failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post("/api/auth/verify-otp", requireDb, async (req: Request, res: Response) => {
  try {
    const { identifier, code } = req.body ?? {};
    if (typeof identifier !== "string" || typeof code !== "string") {
      return res.status(400).json({ error: "identifier and code required" });
    }
    const result = await pool!.query<{ id: string }>(
      `SELECT id FROM otp_codes
       WHERE identifier = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [identifier, code],
    );
    const row = result.rows[0];
    if (!row) return res.status(400).json({ error: "Invalid or expired code" });

    await pool!.query(`UPDATE otp_codes SET used = TRUE WHERE id = $1`, [row.id]);
    res.json({ verified: true });
  } catch (err) {
    console.error("/api/auth/verify-otp failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

app.post(
  "/api/auth/forgot-password",
  // Reuse the OTP limiter — one knob for "stop people abusing email triggers".
  otpLimiter,
  requireDb,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body ?? {};
      // Always return the same response shape so the endpoint can't be used
      // to enumerate which emails have accounts.
      const genericReply = {
        success: true,
        message: "If that email exists you will receive a reset link.",
      };
      if (!isValidEmail(email)) return res.json(genericReply);

      const userRow = await pool!.query<{ id: string }>(
        `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email.toLowerCase()],
      );
      const user = userRow.rows[0];
      if (!user) return res.json(genericReply);

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await pool!.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt],
      );

      // TODO: integrate Resend for real delivery
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[DEV RESET URL]",
          `${FRONTEND_ORIGIN}/reset-password?token=${token}`,
        );
      }
      res.json(genericReply);
    } catch (err) {
      console.error("/api/auth/forgot-password failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.post(
  "/api/auth/reset-password",
  requireDb,
  async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body ?? {};
      if (typeof token !== "string" || token.length === 0) {
        return res.status(400).json({ error: "Token required" });
      }
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: "Password must be at least 8 characters" });
      }

      const result = await pool!.query<{ id: string; user_id: string }>(
        `SELECT id, user_id FROM password_reset_tokens
         WHERE token = $1 AND used = FALSE AND expires_at > NOW()
         LIMIT 1`,
        [token],
      );
      const row = result.rows[0];
      if (!row) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const passwordHash = await hashPassword(newPassword);
      await pool!.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [passwordHash, row.user_id],
      );
      await pool!.query(
        `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
        [row.id],
      );
      res.json({ success: true });
    } catch (err) {
      console.error("/api/auth/reset-password failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.get("/api/auth/me", requireDb, requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const result = await pool!.query<UserRow>(
      `SELECT * FROM users WHERE id = $1`,
      [req.user!.id],
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(publicUser(row));
  } catch (err) {
    console.error("/api/auth/me failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

const PROFILE_FIELDS: Record<string, string> = {
  fullName: "full_name",
  phone: "phone",
  nativeLang: "native_lang",
  targetLang: "target_lang",
  dailyMinutes: "daily_minutes",
  cefrLevel: "cefr_level",
};

app.patch("/api/auth/profile", requireDb, requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const setFragments: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [key, col] of Object.entries(PROFILE_FIELDS)) {
      if (key in (req.body ?? {})) {
        setFragments.push(`${col} = $${i++}`);
        values.push(req.body[key]);
      }
    }
    if (setFragments.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    setFragments.push(`updated_at = NOW()`);
    values.push(req.user!.id);

    const result = await pool!.query<UserRow>(
      `UPDATE users SET ${setFragments.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(publicUser(row));
  } catch (err: any) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return res.status(409).json({ error: "Phone already in use" });
    }
    console.error("/api/auth/profile failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ---------------------------------------------------------------------------
// Sync (all require auth + DB) — uses req.user.id from new auth middleware.
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
        req.user!.id,
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
          req.user!.id,
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
      pool!.query(`SELECT * FROM progress WHERE user_id = $1`, [req.user!.id]),
      pool!.query(`SELECT * FROM srs_cards WHERE user_id = $1`, [req.user!.id]),
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
// Admin seed — DEV ONLY. Creates a default admin user so a local stack can
// log into the admin dashboard without manually running SQL. Returns 404 in
// production so it can never accidentally elevate someone on Railway.
// ---------------------------------------------------------------------------
const SEED_ADMIN = {
  email: "admin@lingualoop.com",
  password: "Admin123!",
  fullName: "Admin",
};

app.post("/api/admin/seed", requireDb, async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const existing = await pool!.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [SEED_ADMIN.email],
    );
    if (existing.rows.length > 0) {
      return res.json({ exists: true, email: SEED_ADMIN.email });
    }
    const passwordHash = await hashPassword(SEED_ADMIN.password);
    await pool!.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'admin')`,
      [SEED_ADMIN.email, passwordHash, SEED_ADMIN.fullName],
    );
    res.json({
      created: true,
      email: SEED_ADMIN.email,
      password: SEED_ADMIN.password,
    });
  } catch (err) {
    console.error("/api/admin/seed failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

// ---------------------------------------------------------------------------
// Admin (all require auth + admin role + DB)
// ---------------------------------------------------------------------------
app.get(
  "/api/admin/stats",
  requireDb,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const [
        totalRes,
        activeTodayRes,
        activeWeekRes,
        plansRes,
        revenueRes,
        newTodayRes,
        newWeekRes,
        newMonthRes,
        avgRes,
      ] = await Promise.all([
        pool!.query<{ c: string }>(
          `SELECT COUNT(*)::text c FROM users WHERE deleted_at IS NULL`,
        ),
        pool!.query<{ c: string }>(
          `SELECT COUNT(*)::text c FROM users WHERE deleted_at IS NULL AND last_active_at > NOW() - INTERVAL '1 day'`,
        ),
        pool!.query<{ c: string }>(
          `SELECT COUNT(*)::text c FROM users WHERE deleted_at IS NULL AND last_active_at > NOW() - INTERVAL '7 days'`,
        ),
        pool!.query<{ subscription_plan: string; c: string }>(
          `SELECT subscription_plan, COUNT(*)::text c
           FROM users WHERE deleted_at IS NULL
           GROUP BY subscription_plan`,
        ),
        pool!.query<{ s: string }>(
          `SELECT COALESCE(SUM(amount_cents),0)::text s
           FROM subscriptions WHERE status != 'cancelled'`,
        ),
        pool!.query<{ c: string }>(
          `SELECT COUNT(*)::text c FROM users WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '1 day'`,
        ),
        pool!.query<{ c: string }>(
          `SELECT COUNT(*)::text c FROM users WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days'`,
        ),
        pool!.query<{ c: string }>(
          `SELECT COUNT(*)::text c FROM users WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'`,
        ),
        pool!.query<{ avg_streak: string | null; avg_xp: string | null }>(
          `SELECT AVG(streak_days)::numeric::text avg_streak, AVG(total_xp)::numeric::text avg_xp
           FROM users WHERE deleted_at IS NULL`,
        ),
      ]);

      const planCounts: Record<string, number> = {};
      for (const r of plansRes.rows) {
        planCounts[r.subscription_plan] = Number(r.c);
      }

      res.json({
        totalUsers: Number(totalRes.rows[0]?.c ?? 0),
        activeToday: Number(activeTodayRes.rows[0]?.c ?? 0),
        activeThisWeek: Number(activeWeekRes.rows[0]?.c ?? 0),
        freeUsers: planCounts["free"] ?? 0,
        proUsers: planCounts["pro"] ?? 0,
        premiumUsers: planCounts["premium"] ?? 0,
        totalRevenue: Number(revenueRes.rows[0]?.s ?? 0),
        newUsersToday: Number(newTodayRes.rows[0]?.c ?? 0),
        newUsersThisWeek: Number(newWeekRes.rows[0]?.c ?? 0),
        newUsersThisMonth: Number(newMonthRes.rows[0]?.c ?? 0),
        avgStreakDays: Math.round(Number(avgRes.rows[0]?.avg_streak ?? 0) * 10) / 10,
        avgXp: Math.round(Number(avgRes.rows[0]?.avg_xp ?? 0)),
      });
    } catch (err) {
      console.error("/api/admin/stats failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

const USER_SORT_COLS: Record<string, string> = {
  created_at: "created_at",
  last_active_at: "last_active_at",
  email: "email",
  full_name: "full_name",
  total_xp: "total_xp",
  streak_days: "streak_days",
  subscription_plan: "subscription_plan",
};

app.get(
  "/api/admin/users",
  requireDb,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const search =
        typeof req.query.search === "string" && req.query.search.length > 0
          ? `%${req.query.search}%`
          : null;
      const plan =
        typeof req.query.plan === "string" && req.query.plan.length > 0
          ? req.query.plan
          : null;
      const sortKey =
        typeof req.query.sort === "string" ? req.query.sort : "created_at";
      const sortCol = USER_SORT_COLS[sortKey] ?? "created_at";
      const order = req.query.order === "asc" ? "ASC" : "DESC";

      const where: string[] = [`deleted_at IS NULL`];
      const params: unknown[] = [];
      if (search) {
        params.push(search);
        where.push(`(email ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
      }
      if (plan) {
        params.push(plan);
        where.push(`subscription_plan = $${params.length}`);
      }
      const whereSql = `WHERE ${where.join(" AND ")}`;

      params.push(limit);
      const limitParam = `$${params.length}`;
      params.push(offset);
      const offsetParam = `$${params.length}`;

      const usersRes = await pool!.query(
        `SELECT id, email, full_name, phone, role,
                subscription_plan, subscription_status,
                streak_days, total_xp, native_lang, target_lang, cefr_level,
                last_active_at, created_at
         FROM users ${whereSql}
         ORDER BY ${sortCol} ${order}
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params,
      );
      const countRes = await pool!.query<{ c: string }>(
        `SELECT COUNT(*)::text c FROM users ${whereSql}`,
        params.slice(0, params.length - 2),
      );

      res.json({
        users: usersRes.rows.map(adminUserRow),
        page,
        limit,
        total: Number(countRes.rows[0]?.c ?? 0),
      });
    } catch (err) {
      console.error("/api/admin/users failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.get(
  "/api/admin/users/:id",
  requireDb,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const [userRes, subsRes, cardsRes] = await Promise.all([
        pool!.query(`SELECT * FROM users WHERE id = $1`, [id]),
        pool!.query(
          `SELECT id, plan, status, amount_cents, currency, started_at, ends_at, cancelled_at, created_at
           FROM subscriptions WHERE user_id = $1 ORDER BY started_at DESC`,
          [id],
        ),
        pool!.query(
          `SELECT id, pair, src, tgt, translit, interval_days, ease_factor, repetitions, due_date, last_reviewed_at
           FROM srs_cards
           WHERE user_id = $1 AND last_reviewed_at IS NOT NULL
           ORDER BY last_reviewed_at DESC
           LIMIT 30`,
          [id],
        ),
      ]);

      const row = userRes.rows[0];
      if (!row) return res.status(404).json({ error: "User not found" });

      res.json({
        user: adminUserRowFull(row),
        subscriptions: subsRes.rows.map((s) => ({
          id: s.id,
          plan: s.plan,
          status: s.status,
          amountCents: s.amount_cents,
          currency: s.currency,
          startedAt: s.started_at,
          endsAt: s.ends_at,
          cancelledAt: s.cancelled_at,
          createdAt: s.created_at,
        })),
        recentReviews: cardsRes.rows.map((c) => ({
          id: c.id,
          pair: c.pair,
          src: c.src,
          tgt: c.tgt,
          translit: c.translit,
          interval: c.interval_days,
          easeFactor: Number(c.ease_factor),
          repetitions: c.repetitions,
          dueDate: c.due_date,
          lastReviewedAt: c.last_reviewed_at,
        })),
      });
    } catch (err) {
      console.error("/api/admin/users/:id failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

const ADMIN_PATCH_FIELDS: Record<string, string> = {
  role: "role",
  subscriptionPlan: "subscription_plan",
  subscriptionStatus: "subscription_status",
};

app.patch(
  "/api/admin/users/:id",
  requireDb,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const setFragments: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      for (const [key, col] of Object.entries(ADMIN_PATCH_FIELDS)) {
        if (key in (req.body ?? {})) {
          setFragments.push(`${col} = $${i++}`);
          values.push(req.body[key]);
        }
      }
      if (setFragments.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      setFragments.push(`updated_at = NOW()`);
      values.push(req.params.id);
      const result = await pool!.query(
        `UPDATE users SET ${setFragments.join(", ")} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
        values,
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: "User not found" });
      res.json(adminUserRowFull(row));
    } catch (err) {
      console.error("PATCH /api/admin/users/:id failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  requireDb,
  requireAdmin,
  async (req: AuthedRequest, res: Response) => {
    try {
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      const result = await pool!.query(
        `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
        [req.params.id],
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/admin/users/:id failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.get(
  "/api/admin/subscriptions",
  requireDb,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const status =
        typeof req.query.status === "string" && req.query.status.length > 0
          ? req.query.status
          : null;

      const where: string[] = [];
      const params: unknown[] = [];
      if (status) {
        params.push(status);
        where.push(`s.status = $${params.length}`);
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

      params.push(limit);
      const limitParam = `$${params.length}`;
      params.push(offset);
      const offsetParam = `$${params.length}`;

      const result = await pool!.query(
        `SELECT s.id, s.plan, s.status, s.amount_cents, s.currency,
                s.started_at, s.ends_at, s.cancelled_at, s.created_at,
                u.id AS user_id, u.email, u.full_name
         FROM subscriptions s
         LEFT JOIN users u ON u.id = s.user_id
         ${whereSql}
         ORDER BY s.created_at DESC
         LIMIT ${limitParam} OFFSET ${offsetParam}`,
        params,
      );
      const countRes = await pool!.query<{ c: string }>(
        `SELECT COUNT(*)::text c FROM subscriptions s ${whereSql}`,
        params.slice(0, params.length - 2),
      );

      res.json({
        subscriptions: result.rows.map((r) => ({
          id: r.id,
          plan: r.plan,
          status: r.status,
          amountCents: r.amount_cents,
          currency: r.currency,
          startedAt: r.started_at,
          endsAt: r.ends_at,
          cancelledAt: r.cancelled_at,
          createdAt: r.created_at,
          user: {
            id: r.user_id,
            email: r.email,
            fullName: r.full_name,
          },
        })),
        page,
        limit,
        total: Number(countRes.rows[0]?.c ?? 0),
      });
    } catch (err) {
      console.error("/api/admin/subscriptions failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

app.get(
  "/api/admin/revenue",
  requireDb,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      // Build the last 12 months bucket (inclusive of current).
      const result = await pool!.query<{ month: Date; plan: string; total: string }>(
        `SELECT DATE_TRUNC('month', created_at) AS month,
                plan,
                COALESCE(SUM(amount_cents),0)::text AS total
         FROM subscriptions
         WHERE created_at > NOW() - INTERVAL '12 months'
           AND status != 'cancelled'
         GROUP BY 1, 2
         ORDER BY 1 ASC`,
      );

      // Build month skeleton (last 12 months in chronological order).
      const months: { month: string; free: number; pro: number; premium: number; total: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ month: key, free: 0, pro: 0, premium: 0, total: 0 });
      }
      const idxByMonth = new Map(months.map((m, i) => [m.month, i]));

      for (const r of result.rows) {
        const d = r.month;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const idx = idxByMonth.get(key);
        if (idx == null) continue;
        const cents = Number(r.total);
        const m = months[idx];
        if (r.plan === "premium") m.premium += cents;
        else if (r.plan === "pro") m.pro += cents;
        else m.free += cents;
        m.total += cents;
      }

      res.json({ months });
    } catch (err) {
      console.error("/api/admin/revenue failed", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  },
);

// Helpers used by admin user mappings ----------------------------------------
function adminUserRow(r: any) {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    phone: r.phone,
    role: r.role,
    subscriptionPlan: r.subscription_plan,
    subscriptionStatus: r.subscription_status,
    streakDays: r.streak_days,
    totalXp: r.total_xp,
    nativeLang: r.native_lang,
    targetLang: r.target_lang,
    cefrLevel: r.cefr_level,
    lastActiveAt: r.last_active_at,
    createdAt: r.created_at,
  };
}
function adminUserRowFull(r: any) {
  return {
    ...adminUserRow(r),
    avatarUrl: r.avatar_url,
    subscriptionStartedAt: r.subscription_started_at,
    subscriptionEndsAt: r.subscription_ends_at,
    dailyMinutes: r.daily_minutes,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Static frontend (production) — serve the Vite build from the workspace root.
// ---------------------------------------------------------------------------
const FRONTEND_DIST = path.join(__dirname, "../../../dist");
app.use(express.static(FRONTEND_DIST));
app.get("*", (req, res, next) => {
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
