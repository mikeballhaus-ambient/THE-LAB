import type { LLMProvider } from '@/shared/types';
import {
  buildIngestTextForKbArticle,
  computeKbArticleIngestContentHash,
} from '@/shared/rag/kb-article-ingest-text';
import {
  listPublishedKbArticlesForIngest,
  type KbArticleIngestSource,
} from '@/backend/mcp/mcp-servers/knowledge-base/kb-reader';
import { KbChunksIndex } from '@/backend/chroma/kb-chunks-index';

export type KbChunksIngestArticleResult = {
  slug: string;
  upserted: number;
  contentHash: string;
  skipped?: 'empty_text';
};

export type KbChunksIngestBatchResult =
  | { ok: false; reason: 'db_unavailable'; upsertedChunks: 0; articles: 0 }
  | {
      ok: true;
      articles: number;
      upsertedChunks: number;
      results: KbChunksIngestArticleResult[];
    };

export function buildIngestTextForArticle(article: KbArticleIngestSource): string {
  return buildIngestTextForKbArticle({
    updatedAt: article.updatedAt,
    body: article.body,
    agentView: article.agentView,
  });
}

export class KbChunksIngestService {
  private static instance: KbChunksIngestService;

  public static getInstance(): KbChunksIngestService {
    if (!KbChunksIngestService.instance) {
      KbChunksIngestService.instance = new KbChunksIngestService();
    }
    return KbChunksIngestService.instance;
  }

  public async listPublishedArticles(): Promise<KbArticleIngestSource[] | null> {
    return listPublishedKbArticlesForIngest();
  }

  public async ingestArticle(params: {
    article: KbArticleIngestSource;
    embedProvider: LLMProvider | undefined;
  }): Promise<KbChunksIngestArticleResult> {
    const { article, embedProvider } = params;
    const ingestText = buildIngestTextForArticle(article);
    const contentHash = computeKbArticleIngestContentHash(
      { updatedAt: article.updatedAt },
      ingestText,
    );

    if (!ingestText.trim()) {
      await KbChunksIndex.getInstance().deleteChunksForSlug(article.slug);
      return { slug: article.slug, upserted: 0, contentHash, skipped: 'empty_text' };
    }

    const { upserted } = await KbChunksIndex.getInstance().upsertArticle({
      slug: article.slug,
      body: ingestText,
      embedProvider,
      contentHash,
    });

    return { slug: article.slug, upserted, contentHash };
  }

  public async ingestAllPublished(params: {
    embedProvider: LLMProvider | undefined;
  }): Promise<KbChunksIngestBatchResult> {
    const sources = await listPublishedKbArticlesForIngest();
    if (!sources) {
      return { ok: false, reason: 'db_unavailable', upsertedChunks: 0, articles: 0 };
    }

    const results: KbChunksIngestArticleResult[] = [];
    let upsertedChunks = 0;

    for (const article of sources) {
      const result = await this.ingestArticle({ article, embedProvider: params.embedProvider });
      results.push(result);
      upsertedChunks += result.upserted;
    }

    return {
      ok: true,
      articles: sources.length,
      upsertedChunks,
      results,
    };
  }
}