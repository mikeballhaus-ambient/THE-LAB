import type { LLMProvider } from '@/shared/types';
import { KB_CHUNKS_COLLECTION_NAME } from '@/shared/rag/kb-chunks-constants';
import { buildKbChunkIngestRecords } from '@/shared/rag/ingest-kb-chunks';
import type { ScoredChunk } from '@/shared/rag/retrieve';
import { chroma } from './chroma';
import { embedTexts } from './provider-embed';

type KbChunkMetadata = {
  slug: string;
  chunkIndex: number;
  start: number;
  end: number;
  contentHash?: string;
};

export class KbChunksIndex {
  private static instance: KbChunksIndex;

  public static getInstance(): KbChunksIndex {
    if (!KbChunksIndex.instance) {
      KbChunksIndex.instance = new KbChunksIndex();
    }
    return KbChunksIndex.instance;
  }

  private async collection() {
    return chroma.getCollection({ name: KB_CHUNKS_COLLECTION_NAME });
  }

  /** Replace all chunks for one article slug (incremental publish hook). */
  public async upsertArticle(params: {
    slug: string;
    body: string;
    embedProvider: LLMProvider | undefined;
    contentHash?: string;
  }): Promise<{ upserted: number }> {
    const { slug, body, embedProvider, contentHash } = params;
    if (!embedProvider?.embed) {
      return { upserted: 0 };
    }

    const records = buildKbChunkIngestRecords(slug, body);
    await this.deleteChunksForSlug(slug);

    if (records.length === 0) {
      return { upserted: 0 };
    }

    const vectors = await embedTexts(
      records.map((record) => record.text),
      embedProvider,
    );

    const col = await this.collection();
    await col.upsert({
      ids: records.map((record) => record.id),
      embeddings: vectors,
      documents: records.map((record) => record.text),
      metadatas: records.map((record) => ({
        slug: record.slug,
        chunkIndex: record.chunkIndex,
        start: record.start,
        end: record.end,
        contentHash: contentHash ?? '',
      } satisfies KbChunkMetadata)),
    });

    return { upserted: records.length };
  }

  public async getStoredContentHashForSlug(slug: string): Promise<string | null> {
    const col = await this.collection();
    const res = await col.get({ where: { slug }, limit: 1 });
    const meta = (res.metadatas?.[0] ?? null) as KbChunkMetadata | null;
    const hash = meta?.contentHash;
    return hash && hash.length > 0 ? hash : null;
  }

  public async deleteChunksForSlug(slug: string): Promise<void> {
    const col = await this.collection();
    const existing = await col.get({ where: { slug } });
    const ids = existing.ids ?? [];
    if (ids.length === 0) {
      return;
    }
    await col.delete({ ids });
  }

  /** Semantic top-k over the KB chunk index (Chroma query). */
  public async queryTopK(params: {
    query: string;
    k: number;
    embedProvider: LLMProvider | undefined;
    minScore?: number;
  }): Promise<ScoredChunk[]> {
    const { query, k, embedProvider, minScore } = params;
    if (!embedProvider?.embed || k <= 0) {
      return [];
    }

    const [queryVector] = await embedTexts([query], embedProvider);
    const col = await this.collection();
    const res = await col.query({
      queryEmbeddings: [queryVector],
      nResults: k,
      include: ['documents', 'metadatas', 'distances'],
    });

    const docs = res.documents?.[0] ?? [];
    const metas = (res.metadatas?.[0] ?? []) as KbChunkMetadata[];
    const distances = res.distances?.[0] ?? [];

    const hits: ScoredChunk[] = [];
    for (let i = 0; i < docs.length; i++) {
      const meta = metas[i];
      const document = docs[i];
      if (!meta || !document) {
        continue;
      }
      const distance = distances[i] ?? 1;
      const score = 1 - distance;
      if (minScore !== undefined && score < minScore) {
        continue;
      }
      hits.push({
        slug: meta.slug,
        chunkIndex: meta.chunkIndex,
        text: document,
        start: meta.start,
        end: meta.end,
        vector: queryVector,
        score,
      });
    }

    return hits;
  }
}