/**
 * SM-2 Spaced Repetition algorithm.
 *
 * Based on the original SuperMemo 2 algorithm by Piotr Wozniak.
 * Grade 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
 *
 * Refs: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import { db, cardId, type SrsCard } from "../data/db";
import type { VocabItem } from "../data/db";

const INITIAL_EASE = 2.5;
const MIN_EASE = 1.3;

export interface GradeResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: number;
}

export function sm2(card: SrsCard, grade: 1 | 2 | 3 | 4): GradeResult {
  let { interval, easeFactor, repetitions } = card;

  if (grade === 1) {
    // Fail — reset
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    // Update ease factor
    easeFactor = Math.max(
      MIN_EASE,
      easeFactor + (0.1 - (4 - grade) * (0.08 + (4 - grade) * 0.02)),
    );
  }

  const dueDate = Date.now() + interval * 24 * 60 * 60 * 1000;
  return { interval, easeFactor, repetitions, dueDate };
}

/** Get or create a SRS card for a vocab item. */
export async function getOrCreateCard(
  pair: string,
  item: VocabItem,
): Promise<SrsCard> {
  const id = cardId(pair, item.tgt);
  const existing = await db.cards.get(id);
  if (existing) return existing;

  const now = Date.now();
  const card: SrsCard = {
    id,
    pair,
    src: item.src,
    tgt: item.tgt,
    translit: item.translit,
    interval: 1,
    easeFactor: INITIAL_EASE,
    repetitions: 0,
    dueDate: now, // due immediately on first encounter
    lastReviewedAt: null,
  };
  await db.cards.put(card);
  return card;
}

/** Apply a grade and persist the updated card + a review record. */
export async function applyGrade(
  card: SrsCard,
  grade: 1 | 2 | 3 | 4,
): Promise<void> {
  const result = sm2(card, grade);
  const now = Date.now();

  await db.transaction("rw", db.cards, db.reviews, async () => {
    await db.cards.put({
      ...card,
      ...result,
      lastReviewedAt: now,
    });
    await db.reviews.add({
      cardId: card.id,
      grade,
      reviewedAt: now,
      intervalAfter: result.interval,
      easeAfter: result.easeFactor,
    });
  });
}

/** Fetch cards due for review for a given pair (up to maxCards). */
export async function getDueCards(
  pair: string,
  maxCards = 20,
): Promise<SrsCard[]> {
  const now = Date.now();
  return db.cards
    .where("[pair+dueDate]")
    .between([pair, 0], [pair, now], true, true)
    .limit(maxCards)
    .toArray();
}
