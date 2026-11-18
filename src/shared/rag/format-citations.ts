import type { ChunkWithMeta } from '@/shared/rag/chunk';
import type { ScoredChunk } from '@/shared/rag/retrieve';

export const KB_RAG_APPENDIX_HEADING = '## Retrieved knowledge (KB)';

export type CitationChunk = Pick<ChunkWithMeta, 'slug' | 'chunkIndex' | 'text'> & {
  score?: number;
};

export type FormatKbRagAppendixOptions = {
  maxChars?: number;
  includeScoreInHeading?: boolean;
};

export function formatCitationLine(slug: string, chunkIndex: number): string {
  return `${slug}#${chunkIndex}`;
}

export function formatChunkCitationHeading(
  slug: string,
  chunkIndex: number,
  score?: number,
  includeScore = false,
): string {
  const base = `### [slug: ${slug}] [chunk: ${chunkIndex}]`;
  if (includeScore && score !== undefined) {
    return `${base} (score: ${score.toFixed(3)})`;
  }
  return base;
}

export function formatChunkCitationBlock(
  chunk: CitationChunk,
  options?: Pick<FormatKbRagAppendixOptions, 'includeScoreInHeading'>,
): string {
  const heading = formatChunkCitationHeading(
    chunk.slug,
    chunk.chunkIndex,
    chunk.score,
    options?.includeScoreInHeading ?? false,
  );
  return `${heading}\n${chunk.text.trim()}`;
}

export function formatCitationLines(chunks: CitationChunk[]): string[] {
  return chunks.map((c) => formatCitationLine(c.slug, c.chunkIndex));
}

export function scoredChunksToCitations(hits: ScoredChunk[]): CitationChunk[] {
  return hits.map(({ slug, chunkIndex, text, score }) => ({
    slug,
    chunkIndex,
    text,
    score,
  }));
}

export function formatKbRagAppendix(
  chunks: CitationChunk[],
  options?: FormatKbRagAppendixOptions,
): string {
  if (chunks.length === 0) {
    return '';
  }

  const maxChars = options?.maxChars;
  const blocks: string[] = [];

  for (const chunk of chunks) {
    const block = formatChunkCitationBlock(chunk, options);
    if (maxChars === undefined) {
      blocks.push(block);
      continue;
    }

    const provisional = [KB_RAG_APPENDIX_HEADING, ...blocks, block].join('\n\n');
    if (provisional.length <= maxChars) {
      blocks.push(block);
      continue;
    }

    const prefixLen =
      blocks.length === 0
        ? KB_RAG_APPENDIX_HEADING.length + 2
        : blocks.join('\n\n').length + KB_RAG_APPENDIX_HEADING.length + 4;
    const room = maxChars - prefixLen - 2;
    if (room > 64) {
      const heading = formatChunkCitationHeading(
        chunk.slug,
        chunk.chunkIndex,
        chunk.score,
        options?.includeScoreInHeading ?? false,
      );
      const bodyBudget = room - heading.length - 1 - '\n[truncated]'.length;
      if (bodyBudget > 0) {
        const trimmed = chunk.text.trim().slice(0, bodyBudget);
        blocks.push(`${heading}\n${trimmed}\n[truncated]`);
      }
    }
    break;
  }

  if (blocks.length === 0) {
    return '';
  }

  return [KB_RAG_APPENDIX_HEADING, ...blocks].join('\n\n');
}