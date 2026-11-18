/** Pure merge helpers for SQL keyword + vector slug boosts (slot C). */

export const KB_RAG_VECTOR_KEYWORD_SCORE_BOOST = 5;
export const KB_RAG_VECTOR_ONLY_ARTICLE_SCORE = 8;

export type KbSearchScoredRow<T> = { row: T; score: number };

export function boostKbSearchScoresWithVectorSlugs<T extends { slug?: string | null }>(
  scored: KbSearchScoredRow<T>[],
  vectorSlugs: string[],
): KbSearchScoredRow<T>[] {
  if (vectorSlugs.length === 0) {
    return scored;
  }

  const slugPriority = new Map<string, number>();
  vectorSlugs.forEach((slug, index) => {
    if (!slugPriority.has(slug)) {
      slugPriority.set(slug, index);
    }
  });

  return scored.map((entry) => {
    const slug = entry.row.slug ?? undefined;
    if (!slug || !slugPriority.has(slug)) {
      return entry;
    }
    return {
      row: entry.row,
      score: entry.score + KB_RAG_VECTOR_KEYWORD_SCORE_BOOST,
    };
  });
}

export function mergeKbSearchScoresWithVectorOnlyRows<T extends { slug?: string | null }>(
  scored: KbSearchScoredRow<T>[],
  vectorOnlyRows: T[],
): KbSearchScoredRow<T>[] {
  const present = new Set(
    scored.map((entry) => entry.row.slug).filter((slug): slug is string => Boolean(slug)),
  );
  const extras: KbSearchScoredRow<T>[] = [];
  for (const row of vectorOnlyRows) {
    const slug = row.slug ?? undefined;
    if (!slug || present.has(slug)) {
      continue;
    }
    extras.push({ row, score: KB_RAG_VECTOR_ONLY_ARTICLE_SCORE });
    present.add(slug);
  }
  return [...scored, ...extras];
}

export function sortKbSearchScoredRows<T>(
  scored: KbSearchScoredRow<T>[],
  tieBreak: (a: T, b: T) => number,
): KbSearchScoredRow<T>[] {
  return [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return tieBreak(a.row, b.row);
  });
}