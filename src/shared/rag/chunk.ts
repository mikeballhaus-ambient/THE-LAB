/**
 * RAG text chunking for KB document index.
 *
 * Sizes (match embed path in provider-embed.ts):
 *   MAX_CHUNK_CHARS = 1250 — one embed per chunk; provider truncates at this ceiling
 *   OVERLAP_CHARS     = 150  — tail of chunk N repeats at head of chunk N+1
 */

export const MAX_CHUNK_CHARS = 1250;
export const OVERLAP_CHARS = 150;

const SOFT_BREAK_LOOKBACK = 250;

export type ChunkRecord = {
  chunkIndex: number;
  text: string;
  start: number;
  end: number;
};

export type ChunkWithMeta = ChunkRecord & {
  slug: string;
};

function findSplitEnd(text: string, start: number, hardEnd: number): number {
  if (hardEnd >= text.length) {
    return text.length;
  }

  const cappedHard = Math.min(hardEnd, start + MAX_CHUNK_CHARS);
  const searchStart = Math.max(start + 1, cappedHard - SOFT_BREAK_LOOKBACK);
  const slice = text.slice(searchStart, cappedHard);

  const paragraph = slice.lastIndexOf('\n\n');
  if (paragraph >= 0) {
    return searchStart + paragraph + 2;
  }

  const line = slice.lastIndexOf('\n');
  if (line >= 0) {
    return searchStart + line + 1;
  }

  const space = slice.lastIndexOf(' ');
  if (space >= 0) {
    return searchStart + space + 1;
  }

  return cappedHard;
}

export function chunkText(text: string): ChunkRecord[] {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return [];
  }

  const chunks: ChunkRecord[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + MAX_CHUNK_CHARS, normalized.length);
    const end = findSplitEnd(normalized, start, hardEnd);
    const slice = normalized.slice(start, end);

    if (!slice.trim()) {
      break;
    }

    chunks.push({
      chunkIndex,
      text: slice,
      start,
      end,
    });

    if (end >= normalized.length) {
      break;
    }

    const nextStart = end - OVERLAP_CHARS;
    start = nextStart > start ? nextStart : end;
    chunkIndex += 1;
  }

  return chunks;
}

export function chunkDocument(slug: string, text: string): ChunkWithMeta[] {
  return chunkText(text).map((chunk) => ({ ...chunk, slug }));
}