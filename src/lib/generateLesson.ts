import type { Lesson } from "../data/db";
import { db } from "../data/db";
import type { LangCode } from "../data/languages";
import { generateLessonViaApi } from "./claude";

export async function generateLesson(
  pair: string,
  unit: number,
  lessonNum: number,
  level: "A1" | "A2" | "B1",
  nativeLang: LangCode,
  targetLang: LangCode,
): Promise<Lesson> {
  const lesson = await generateLessonViaApi<Lesson>({
    pair,
    unit,
    lessonNum,
    level,
    nativeLang,
    targetLang,
  });

  await db.lessons.put(lesson);
  return lesson;
}
