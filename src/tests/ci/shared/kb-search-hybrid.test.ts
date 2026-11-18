import { describe, expect, test } from '@jest/globals';
import {
  KB_RAG_VECTOR_KEYWORD_SCORE_BOOST,
  KB_RAG_VECTOR_ONLY_ARTICLE_SCORE,
  boostKbSearchScoresWithVectorSlugs,
  mergeKbSearchScoresWithVectorOnlyRows,
  sortKbSearchScoredRows,
} from '@/shared/rag/kb-search-hybrid';

describe('kb-search-hybrid', () => {
  test('boostKbSearchScoresWithVectorSlugs adds boost for vector slugs', () => {
    const scored = [
      { row: { slug: 'a' }, score: 1 },
      { row: { slug: 'b' }, score: 4 },
    ];
    const boosted = boostKbSearchScoresWithVectorSlugs(scored, ['a']);
    expect(boosted[0].score).toBe(1 + KB_RAG_VECTOR_KEYWORD_SCORE_BOOST);
    expect(boosted[1].score).toBe(4);
  });

  test('mergeKbSearchScoresWithVectorOnlyRows appends vector-only articles', () => {
    const scored = [{ row: { slug: 'a' }, score: 2 }];
    const merged = mergeKbSearchScoresWithVectorOnlyRows(scored, [{ slug: 'b' }, { slug: 'a' }]);
    expect(merged).toHaveLength(2);
    expect(merged[1].row.slug).toBe('b');
    expect(merged[1].score).toBe(KB_RAG_VECTOR_ONLY_ARTICLE_SCORE);
  });

  test('sortKbSearchScoredRows orders by score desc', () => {
    const sorted = sortKbSearchScoredRows(
      [
        { row: { id: 1, updated_at: '2020' }, score: 1 },
        { row: { id: 2, updated_at: '2021' }, score: 3 },
      ],
      (a, b) => String(b.updated_at).localeCompare(String(a.updated_at)),
    );
    expect(sorted[0].row.id).toBe(2);
  });
});