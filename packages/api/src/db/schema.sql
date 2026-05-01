-- Requires Postgres 13+ (gen_random_uuid is in core; on older PG enable pgcrypto).

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_active_date TEXT,
  minutes_today INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  pair TEXT NOT NULL,
  unit INTEGER NOT NULL,
  lesson_num INTEGER NOT NULL,
  level TEXT NOT NULL,
  data JSONB NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS srs_cards (
  id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  src TEXT NOT NULL,
  tgt TEXT NOT NULL,
  translit TEXT,
  interval_days INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  due_date TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  PRIMARY KEY (id, user_id)
);
