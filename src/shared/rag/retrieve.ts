import type { ChunkWithMeta } from '@/shared/rag/chunk';

export type EmbeddedChunk = ChunkWithMeta & {
  vector: number[];
};

export type ScoredChunk = EmbeddedChunk & {
  score: number;
};

export type RetrieveOptions = {
  minScore?: number;
};

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) {
    return 0;
  }

  return dot / denom;
}

export function retrieveTopK(
  queryVector: number[],
  chunks: EmbeddedChunk[],
  k: number,
  options?: RetrieveOptions,
): ScoredChunk[] {
  const limit = Math.max(0, Math.floor(k));
  if (limit === 0 || chunks.length === 0) {
    return [];
  }

  const minScore = options?.minScore ?? Number.NEGATIVE_INFINITY;

  const scored: ScoredChunk[] = chunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryVector, chunk.vector),
  }));

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (left.slug !== right.slug) {
      return left.slug.localeCompare(right.slug);
    }
    return left.chunkIndex - right.chunkIndex;
  });

  const filtered = scored.filter((row) => row.score >= minScore);
  return filtered.slice(0, limit);
}

export async function retrieveTopKForQuery(
  query: string,
  chunks: EmbeddedChunk[],
  k: number,
  embed: (text: string) => Promise<number[]>,
  options?: RetrieveOptions,
): Promise<ScoredChunk[]> {
  const queryVector = await embed(query);
  return retrieveTopK(queryVector, chunks, k, options);
}