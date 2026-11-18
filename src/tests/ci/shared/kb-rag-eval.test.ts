import { describe, expect, test } from '@jest/globals';
import { chunkDocument } from '@/shared/rag/chunk';
import type { EmbeddedChunk } from '@/shared/rag/retrieve';
import { retrieveTopKForQuery } from '@/shared/rag/retrieve';
import {
  KB_RAG_CORPUS_FIXTURE,
} from '@/tests/ci/shared/__fixtures__/kb-rag-corpus-fixture';
import { KB_RAG_EVAL_CASES } from '@/tests/ci/shared/__fixtures__/kb-rag-eval-cases';

const EMBED_DIM = 96;

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9]+/g) ?? [];
  const hyphenPhrases = lower.match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? [];
  return [...words, ...hyphenPhrases];
}

function fixtureEmbed(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  for (const token of tokenize(text)) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % EMBED_DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vec;
  }
  return vec.map((value) => value / norm);
}

async function embedAsync(text: string): Promise<number[]> {
  return fixtureEmbed(text);
}

function indexFixtureCorpus(): EmbeddedChunk[] {
  const indexed: EmbeddedChunk[] = [];
  for (const doc of KB_RAG_CORPUS_FIXTURE) {
    for (const chunk of chunkDocument(doc.slug, doc.body)) {
      indexed.push({ ...chunk, vector: fixtureEmbed(chunk.text) });
    }
  }
  return indexed;
}

const indexedCorpus = indexFixtureCorpus();

describe('kb-rag eval cases', () => {
  for (const evalCase of KB_RAG_EVAL_CASES) {
    test(`${evalCase.expectSlugInTop3} in top 3 for query`, async () => {
      const hits = await retrieveTopKForQuery(
        evalCase.query,
        indexedCorpus,
        3,
        embedAsync,
        { minScore: 0.05 },
      );
      const topSlugs = [...new Set(hits.map((hit) => hit.slug))];
      expect(topSlugs).toContain(evalCase.expectSlugInTop3);
    });
  }
});