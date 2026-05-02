/**
 * Canonical curriculum spec used by the bulk-seed script.
 *
 * 3 levels × 5 units × 3 lessons = 45 lessons per language pair.
 * Each entry pairs a theme (lesson title) with a focus blurb that gets
 * appended to the Claude prompt so the generated content stays on-brief.
 *
 * Hand-edit this file to grow / re-shape the curriculum. Re-running the
 * seed script is idempotent — already-existing lessons are skipped.
 */

export type CefrLevel = "A1" | "A2" | "B1";

export interface CurriculumSlot {
  level: CefrLevel;
  unit: number;
  lessonNum: number;
  /** Short user-facing lesson title. */
  theme: string;
  /** Hint to Claude so the vocab/phrases stay topical. */
  focus: string;
}

interface UnitSpec {
  /** User-facing unit name shown in the curriculum browser. */
  name: string;
  /** 3 lessons per unit, [theme, focus] tuples. */
  lessons: [string, string][];
}

const LEVELS: Record<CefrLevel, UnitSpec[]> = {
  A1: [
    {
      name: "Greetings",
      lessons: [
        ["Hello & Goodbye", "basic greetings, polite words like please and thank you, yes/no"],
        ["How are you?", "asking and answering about wellbeing, fine/well/tired"],
        ["Where are you from?", "introducing yourself, country and nationality words"],
      ],
    },
    {
      name: "Numbers & Time",
      lessons: [
        ["Numbers 1–10", "counting, cardinal numbers, telling phone numbers"],
        ["Numbers 11–100", "larger cardinal numbers and dates"],
        ["Days & telling time", "hours of the day, days of the week"],
      ],
    },
    {
      name: "Family",
      lessons: [
        ["Family members", "mother, father, siblings, grandparents"],
        ["Possessives", "my, your, his, her — applied to family"],
        ["Describing people", "tall, short, kind, simple adjectives for people"],
      ],
    },
    {
      name: "Food & Drink",
      lessons: [
        ["Common foods", "bread, rice, water, fruit, basic items"],
        ["At a restaurant", "ordering food, asking for the bill, polite requests"],
        ["Likes & dislikes", "I like / I don't like, food preferences"],
      ],
    },
    {
      name: "Daily Life",
      lessons: [
        ["Daily routine", "wake up, eat, work, sleep — verbs of routine"],
        ["Yesterday, today, tomorrow", "basic time references"],
        ["Common verbs", "go, come, do, make — high-frequency verbs"],
      ],
    },
  ],
  A2: [
    {
      name: "Travel",
      lessons: [
        ["Asking directions", "where is, near, far, left/right/straight"],
        ["At the hotel", "booking, check-in, room vocabulary"],
        ["Transport", "bus, train, taxi, buying a ticket"],
      ],
    },
    {
      name: "Shopping",
      lessons: [
        ["Clothes & sizes", "shirt, trousers, small/medium/large, colours"],
        ["At the market", "haggling, prices, common produce"],
        ["Money & paying", "cash, card, exchange, asking 'how much?'"],
      ],
    },
    {
      name: "Free Time",
      lessons: [
        ["Hobbies", "reading, sports, music, what do you do for fun?"],
        ["Making plans", "let's, would you like to, suggesting an activity"],
        ["Weather & seasons", "sunny, rainy, cold, hot, four seasons"],
      ],
    },
    {
      name: "Work & Studies",
      lessons: [
        ["Jobs & professions", "doctor, teacher, engineer, what do you do?"],
        ["At the office", "meeting, email, deadline, common workplace nouns"],
        ["School subjects", "math, history, science, vocabulary for studying"],
      ],
    },
    {
      name: "Health & Body",
      lessons: [
        ["Body parts", "head, arm, leg, common body vocabulary"],
        ["At the doctor", "I have a headache / fever / cold, basic symptoms"],
        ["Healthy living", "exercise, sleep, water, advice expressions"],
      ],
    },
  ],
  B1: [
    {
      name: "Opinions",
      lessons: [
        ["I think / I believe", "expressing opinions, agreement, disagreement"],
        ["Comparisons", "better, worse, more, less, comparative structures"],
        ["Explaining reasons", "because, so, therefore — connecting ideas"],
      ],
    },
    {
      name: "Society",
      lessons: [
        ["News headlines", "politics, economy, sport — news vocabulary"],
        ["Environment", "pollution, recycling, climate, modern issues"],
        ["Technology", "phone, internet, app — modern life vocabulary"],
      ],
    },
    {
      name: "Culture",
      lessons: [
        ["Holidays & traditions", "festivals, celebrations, cultural rituals"],
        ["Music & art", "describing music, art, books, opinions on culture"],
        ["Food culture", "traditional dishes, cooking methods, ingredients"],
      ],
    },
    {
      name: "Future Plans",
      lessons: [
        ["Goals & dreams", "I want to, I'm going to, future tense basics"],
        ["Travel plans", "next year, in the future, planning a trip"],
        ["Career hopes", "ambitions, study plans, professional goals"],
      ],
    },
    {
      name: "Past Experiences",
      lessons: [
        ["Stories from childhood", "past tense, when I was young"],
        ["Recent events", "yesterday, last week, present perfect basics"],
        ["Memorable trips", "where, when, how — narrating a past experience"],
      ],
    },
  ],
};

/**
 * Per-level unit-number offset. Lesson IDs are `${pair}:${unit}:${lessonNum}`
 * so unit numbers must be unique across the whole curriculum — we offset
 * each level by 5. The user-facing labels stay 1-relative ("A2 Unit 1").
 */
const LEVEL_OFFSET: Record<CefrLevel, number> = {
  A1: 0,
  A2: 5,
  B1: 10,
};

/** Flat list of every (level, unit, lessonNum, theme, focus) target. */
export const CURRICULUM_SLOTS: CurriculumSlot[] = (
  Object.entries(LEVELS) as [CefrLevel, UnitSpec[]][]
).flatMap(([level, units]) =>
  units.flatMap((u, uIdx) =>
    u.lessons.map(([theme, focus], lIdx) => ({
      level,
      unit: LEVEL_OFFSET[level] + uIdx + 1,
      lessonNum: lIdx + 1,
      theme,
      focus,
    })),
  ),
);

/** Curriculum metadata (shown in the curriculum browser UI). */
export const CURRICULUM_TREE = (
  Object.entries(LEVELS) as [CefrLevel, UnitSpec[]][]
).map(([level, units]) => ({
  level,
  units: units.map((u, uIdx) => ({
    /** Absolute unit number used in lesson IDs and routing. */
    unit: LEVEL_OFFSET[level] + uIdx + 1,
    /** 1-relative within this level (display only). */
    unitInLevel: uIdx + 1,
    name: u.name,
    lessons: u.lessons.map(([theme], lIdx) => ({
      lessonNum: lIdx + 1,
      theme,
    })),
  })),
}));

/** Pairs the bulk seeder will populate. Cross-language pairs (e.g. es-am)
 * stay lazy-AI-on-demand so we don't pay for content nobody opens. */
export const CURATED_PAIRS: string[] = [
  "en-es", "es-en",
  "en-fr", "fr-en",
  "en-am", "am-en",
  "en-ti", "ti-en",
  "en-ar", "ar-en",
];
