import { describe, expect, test } from '@jest/globals';
import { MAX_CHUNK_CHARS, chunkDocument, chunkText } from '@/shared/rag/chunk';
import {
  KB_RAG_APPENDIX_HEADING,
  formatCitationLines,
  formatKbRagAppendix,
  scoredChunksToCitations,
} from '@/shared/rag/format-citations';
import { buildKbChunkIngestRecords, kbChunkStorageId } from '@/shared/rag/ingest-kb-chunks';
import type { EmbeddedChunk } from '@/shared/rag/retrieve';
import { cosineSimilarity, retrieveTopKForQuery } from '@/shared/rag/retrieve';
import {
  KB_RAG_CORPUS_FIXTURE,
  KB_RAG_GOLDEN_QUERY,
} from '@/tests/ci/shared/__fixtures__/kb-rag-corpus-fixture';

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

describe('kb-rag shared', () => {
  test('chunkText respects MAX_CHUNK_CHARS', () => {
    const text = `${'word '.repeat(90)}\n\n`.repeat(14);
    for (const chunk of chunkText(text)) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
    }
  });

  test('buildKbChunkIngestRecords uses stable storage ids', () => {
    const records = buildKbChunkIngestRecords('kb-rag', 'Hello KB RAG.');
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(kbChunkStorageId('kb-rag', 0));
  });

  test('golden query retrieves kb-chunks and chat-memory in top 2', async () => {
    const hits = await retrieveTopKForQuery(
      KB_RAG_GOLDEN_QUERY,
      indexFixtureCorpus(),
      3,
      embedAsync,
      { minScore: 0.05 },
    );

    expect(hits.length).toBeGreaterThanOrEqual(2);
    const slugs = hits.map((hit) => hit.slug);
    expect(slugs.slice(0, 2)).toEqual(
      expect.arrayContaining(['kb-chunks', 'chat-memory']),
    );
    expect(cosineSimilarity(hits[0].vector, hits[0].vector)).toBeCloseTo(1, 5);
  });

  test('formatKbRagAppendix matches slot A heading shape', async () => {
    const hits = await retrieveTopKForQuery(
      KB_RAG_GOLDEN_QUERY,
      indexFixtureCorpus(),
      2,
      embedAsync,
    );
    const appendix = formatKbRagAppendix(scoredChunksToCitations(hits));

    expect(appendix.startsWith(KB_RAG_APPENDIX_HEADING)).toBe(true);
    expect(appendix).toContain('### [slug: kb-chunks] [chunk: 0]');
    expect(formatCitationLines(scoredChunksToCitations(hits))).toEqual(
      expect.arrayContaining(['kb-chunks#0', 'chat-memory#0']),
    );
  });
});