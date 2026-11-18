import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import {
  isKbRagIngestDomainEventType,
  isKbRagIndexRemoveDomainEventType,
  readKbArticleIdFromDomainEventPayload,
  readKbIngestSlugFromEventPayload,
} from '@/shared/rag/kb-rag-domain-events';
import { resolveUserEmbedProviderAdapter } from '@/backend/chroma/kb-rag-embed-provider';
import { getKbArticleIngestSourceById } from '@/backend/mcp/mcp-servers/knowledge-base/kb-reader';
import { KbChunksIngestService } from '@/backend/chroma/kb-chunks-ingest';
import { KbChunksIndex } from '@/backend/chroma/kb-chunks-index';
import { VSCodeLogger } from '@/backend/utils/logger';

function isKbRagIngestOnPublishEnabled(): boolean {
  return process.env.LAB_KB_RAG_INGEST_ON_PUBLISH !== '0';
}

async function removeKbArticleIndexFromDomainEvent(
  envelope: LabDomainEventEnvelopeV1,
): Promise<void> {
  if (!isKbRagIndexRemoveDomainEventType(envelope.type)) {
    return;
  }

  const articleId = readKbArticleIdFromDomainEventPayload(envelope.payload);
  if (articleId === null) {
    return;
  }

  const slug = readKbIngestSlugFromEventPayload(envelope.payload, articleId);
  await KbChunksIndex.getInstance().deleteChunksForSlug(slug);

  const logger = await VSCodeLogger.getInstance();
  logger.info(`[kb-rag] removed index slug=${slug} event=${envelope.type}`);
}

/**
 * Incremental KB → Chroma ingest when a published article is saved (lab-events pipeline).
 * Fire-and-forget from {@link publishLabDomainEventPipeline}.
 */
export async function ingestKbArticleFromDomainEvent(
  envelope: LabDomainEventEnvelopeV1,
): Promise<void> {
  if (!isKbRagIngestOnPublishEnabled()) {
    return;
  }
  if (!isKbRagIngestDomainEventType(envelope.type)) {
    return;
  }

  const articleId = readKbArticleIdFromDomainEventPayload(envelope.payload);
  if (articleId === null) {
    return;
  }

  const source = await getKbArticleIngestSourceById(articleId);
  if (!source) {
    return;
  }

  const userId = envelope.actorUserId;
  const embedProvider =
    userId !== undefined ? resolveUserEmbedProviderAdapter(userId) : undefined;

  if (!embedProvider?.embed) {
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[kb-rag] ingest skipped for article ${articleId}: no embed provider (userId=${userId ?? 'n/a'})`,
    );
    return;
  }

  const result = await KbChunksIngestService.getInstance().ingestArticle({
    article: source,
    embedProvider,
  });

  const logger = await VSCodeLogger.getInstance();
  logger.info(
    `[kb-rag] ingested slug=${result.slug} chunks=${result.upserted} event=${envelope.type}`,
  );
}

/** KB RAG side effects on lab domain events (ingest + index removal). */
export async function handleKbRagDomainEvent(
  envelope: LabDomainEventEnvelopeV1,
): Promise<void> {
  if (!isKbRagIngestOnPublishEnabled()) {
    return;
  }
  if (isKbRagIndexRemoveDomainEventType(envelope.type)) {
    await removeKbArticleIndexFromDomainEvent(envelope);
    return;
  }
  await ingestKbArticleFromDomainEvent(envelope);
}