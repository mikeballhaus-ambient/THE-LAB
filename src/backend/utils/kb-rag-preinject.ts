import { resolveUserEmbedProviderAdapter } from '@/backend/chroma/kb-rag-embed-provider';
import { KbChunksIndex } from '@/backend/chroma/kb-chunks-index';
import { VSCodeLogger } from '@/backend/utils/logger';
import { appendKbRagAppendixToSystemMessage } from '@/backend/utils/kb-rag-system-prompt';
import {
  isKbRagSlotAEnabled,
  isKbRagStructuredLogsEnabled,
  resolveKbRagMaxAppendixChars,
  resolveKbRagMinQueryChars,
  resolveKbRagMinScore,
  resolveKbRagPreinjectTopK,
} from '@/shared/config/kb-rag-config';
import {
  formatKbRagAppendix,
  formatCitationLines,
  scoredChunksToCitations,
} from '@/shared/rag/format-citations';

export async function appendKbRagLayersToSystemMessage(
  sysMsg: string,
  params: { latestUserMessage: string; userId: number; currentPersonaName?: string },
): Promise<string> {
  if (!isKbRagSlotAEnabled()) {
    return sysMsg;
  }

  const query = (params.latestUserMessage ?? '').trim();
  if (query.length < resolveKbRagMinQueryChars()) {
    return sysMsg;
  }

  const embedProvider = resolveUserEmbedProviderAdapter(params.userId);
  if (!embedProvider?.embed) {
    return sysMsg;
  }

  let hits;
  try {
    hits = await KbChunksIndex.getInstance().queryTopK({
      query,
      k: resolveKbRagPreinjectTopK(),
      embedProvider,
      minScore: resolveKbRagMinScore(),
    });
  } catch (error: unknown) {
    const logger = await VSCodeLogger.getInstance();
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[kb-rag] slot A queryTopK failed (userId=${params.userId}): ${message}`);
    if (error instanceof Error && error.stack) {
      logger.warn(error.stack);
    }
    return sysMsg;
  }

  if (hits.length === 0) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[kb-rag] slot A no chunks above minScore=${resolveKbRagMinScore()} ` +
        `(userId=${params.userId}, queryChars=${query.length}) — ` +
        'try LAB_KB_RAG_MIN_SCORE=0.05, confirm LM Studio embed + npm run kb-rag:reindex, ' +
        'or probe: npx tsx --env-file=.env src/scripts/kb-rag-probe-query.ts "<your query>"',
    );
    return sysMsg;
  }

  const citations = scoredChunksToCitations(hits);
  const appendix = formatKbRagAppendix(citations, {
    maxChars: resolveKbRagMaxAppendixChars(),
  });

  if (!appendix) {
    return sysMsg;
  }

  if (isKbRagStructuredLogsEnabled()) {
    const logger = await VSCodeLogger.getInstance();
    logger.info(
      JSON.stringify({
        event: 'kb_rag_preinject',
        persona: params.currentPersonaName ?? null,
        queryChars: query.length,
        hitCount: hits.length,
        citations: formatCitationLines(citations),
      }),
    );
  }

  return appendKbRagAppendixToSystemMessage(sysMsg, appendix);
}