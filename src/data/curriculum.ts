/**
 * User-facing curriculum tree shown in the /curriculum browser.
 *
 * Keep this in sync with packages/api/src/curriculum.ts — the backend is the
 * source of truth for what the seed script generates, this is the source of
 * truth for what the frontend displays. Same shape, same offsets.
 */

export type CefrLevel = "A1" | "A2" | "B1";

export interface CurriculumLesson {
  lessonNum: number;
  theme: string;
}

export interface CurriculumUnit {
  /** Absolute unit number (used in lesson IDs / routes). */
  unit: number;
  /** Display name shown in the UI. */
  name: string;
  /** 1-relative within the level — e.g. A2 Unit 1, A2 Unit 2 … */
  unitInLevel: number;
  lessons: CurriculumLesson[];
}

export interface CurriculumLevel {
  level: CefrLevel;
  units: CurriculumUnit[];
}

const LEVEL_OFFSET: Record<CefrLevel, number> = { A1: 0, A2: 5, B1: 10 };

interface UnitSpec {
  name: string;
  lessons: string[]; // theme list (lesson titles)
}

const LEVELS: Record<CefrLevel, UnitSpec[]> = {
  A1: [
    { name: "Greetings", lessons: ["Hello & Goodbye", "How are you?", "Where are you from?"] },
    { name: "Numbers & Time", lessons: ["Numbers 1–10", "Numbers 11–100", "Days & telling time"] },
    { name: "Family", lessons: ["Family members", "Possessives", "Describing people"] },
    { name: "Food & Drink", lessons: ["Common foods", "At a restaurant", "Likes & dislikes"] },
    { name: "Daily Life", lessons: ["Daily routine", "Yesterday, today, tomorrow", "Common verbs"] },
  ],
  A2: [
    { name: "Travel", lessons: ["Asking directions", "At the hotel", "Transport"] },
    { name: "Shopping", lessons: ["Clothes & sizes", "At the market", "Money & paying"] },
    { name: "Free Time", lessons: ["Hobbies", "Making plans", "Weather & seasons"] },
    { name: "Work & Studies", lessons: ["Jobs & professions", "At the office", "School subjects"] },
    { name: "Health & Body", lessons: ["Body parts", "At the doctor", "Healthy living"] },
  ],
  B1: [
    { name: "Opinions", lessons: ["I think / I believe", "Comparisons", "Explaining reasons"] },
    { name: "Society", lessons: ["News headlines", "Environment", "Technology"] },
    { name: "Culture", lessons: ["Holidays & traditions", "Music & art", "Food culture"] },
    { name: "Future Plans", lessons: ["Goals & dreams", "Travel plans", "Career hopes"] },
    { name: "Past Experiences", lessons: ["Stories from childhood", "Recent events", "Memorable trips"] },
  ],
};

export const CURRICULUM_TREE: CurriculumLevel[] = (
  Object.entries(LEVELS) as [CefrLevel, UnitSpec[]][]
).map(([level, units]) => ({
  level,
  units: units.map((u, uIdx) => ({
    unit: LEVEL_OFFSET[level] + uIdx + 1,
    unitInLevel: uIdx + 1,
    name: u.name,
    lessons: u.lessons.map((theme, lIdx) => ({
      lessonNum: lIdx + 1,
      theme,
    })),
  })),
}));
