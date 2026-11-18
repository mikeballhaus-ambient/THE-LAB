import {
  isKbRagIngestEnabled,
  isKbRagStartupReconcileEnabled,
  resolveKbRagEmbedUserId,
} from '@/shared/config/kb-rag-config';
import { resolveUserEmbedProviderAdapter } from '@/backend/chroma/kb-rag-embed-provider';
import { KbChunksIndex } from '@/backend/chroma/kb-chunks-index';
import { KbChunksIngestService } from '@/backend/chroma/kb-chunks-ingest';
import { computeKbArticleIngestContentHash } from '@/shared/rag/kb-article-ingest-text';
import { buildIngestTextForArticle } from '@/backend/chroma/kb-chunks-ingest';
import { VSCodeLogger } from '@/backend/utils/logger';

export type KbChunksStartupReconcilePhase = 'post-chroma' | 'post-warmup';

function kbRagStartupConsole(level: 'info' | 'warn', message: string): void {
  if (level === 'warn') {
    console.warn(message);
  } else {
    console.log(message);
  }
  void VSCodeLogger.getInstance().then((logger) => logger[level](message));
}

export type KbChunksReconcileResult =
  | { ok: false; reason: 'disabled' | 'db_unavailable' | 'no_embed_provider' }
  | { ok: true; articles: number; reindexed: number; unchanged: number };

export async function reconcileKbChunksIndex(params?: {
  force?: boolean;
  embedUserId?: number;
}): Promise<KbChunksReconcileResult> {
  if (!isKbRagIngestEnabled()) {
    return { ok: false, reason: 'disabled' };
  }

  const userId = params?.embedUserId ?? resolveKbRagEmbedUserId();
  const embedProvider = resolveUserEmbedProviderAdapter(userId);
  if (!embedProvider?.embed) {
    return { ok: false, reason: 'no_embed_provider' };
  }

  const articles = await KbChunksIngestService.getInstance().listPublishedArticles();
  if (!articles) {
    return { ok: false, reason: 'db_unavailable' };
  }

  let reindexed = 0;
  let unchanged = 0;
  const index = KbChunksIndex.getInstance();
  const ingest = KbChunksIngestService.getInstance();

  for (const article of articles) {
    const ingestText = buildIngestTextForArticle(article);
    const expectedHash = computeKbArticleIngestContentHash(
      { updatedAt: article.updatedAt },
      ingestText,
    );
    const storedHash = await index.getStoredContentHashForSlug(article.slug);

    if (!params?.force && storedHash === expectedHash) {
      unchanged += 1;
      continue;
    }

    await ingest.ingestArticle({ article, embedProvider });
    reindexed += 1;
  }

  return { ok: true, articles: articles.length, reindexed, unchanged };
}

export async function runKbChunksStartupReconcile(options?: {
  phase?: KbChunksStartupReconcilePhase;
}): Promise<void> {
  const phase = options?.phase ?? 'post-chroma';
  const phaseTag = phase === 'post-warmup' ? 'post-warmup' : 'post-chroma';

  if (!isKbRagStartupReconcileEnabled()) {
    if (phase === 'post-chroma') {
      kbRagStartupConsole(
        'info',
        '[kb-rag] startup reconcile disabled (LAB_KB_RAG_STARTUP_RECONCILE=0)',
      );
    }
    return;
  }

  if (!isKbRagIngestEnabled()) {
    kbRagStartupConsole(
      'info',
      `[kb-rag] startup reconcile (${phaseTag}) skipped: ingest disabled (LAB_KB_RAG_INGEST_ON_PUBLISH=0)`,
    );
    return;
  }

  const embedUserId = resolveKbRagEmbedUserId();
  kbRagStartupConsole('info', `[kb-rag] startup reconcile (${phaseTag}) starting…`);

  const result = await reconcileKbChunksIndex({ embedUserId });

  if (!result.ok) {
    if (result.reason === 'no_embed_provider') {
      kbRagStartupConsole(
        'warn',
        `[kb-rag] startup reconcile (${phaseTag}) skipped: no embed provider for user ${embedUserId} ` +
          '(configure Settings → embed provider or set LAB_KB_RAG_EMBED_USER_ID; embed server must be reachable)',
      );
      return;
    }
    if (result.reason === 'db_unavailable') {
      const hint =
        phase === 'post-chroma'
          ? ' — will retry after platform app warm-up if enabled'
          : ' — launch Knowledge Base once or run npm run kb-rag:reindex';
      kbRagStartupConsole(
        'warn',
        `[kb-rag] startup reconcile (${phaseTag}) skipped: Knowledge Base SQLite unavailable${hint}`,
      );
      return;
    }
    kbRagStartupConsole('warn', `[kb-rag] startup reconcile (${phaseTag}) skipped: ${result.reason}`);
    return;
  }

  kbRagStartupConsole(
    'info',
    `[kb-rag] startup reconcile (${phaseTag}) ok — articles=${result.articles} ` +
      `reindexed=${result.reindexed} unchanged=${result.unchanged} (Chroma collection kb-chunks)`,
  );
}