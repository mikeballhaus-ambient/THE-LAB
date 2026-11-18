import { chunkDocument, type ChunkWithMeta } from '@/shared/rag/chunk';

export function kbChunkStorageId(slug: string, chunkIndex: number): string {
  return `${slug}::${chunkIndex}`;
}

export type KbChunkIngestRecord = ChunkWithMeta & {
  id: string;
};

/** Pure ingest prep: chunk body text for one published KB article slug. */
export function buildKbChunkIngestRecords(slug: string, body: string): KbChunkIngestRecord[] {
  return chunkDocument(slug, body).map((chunk) => ({
    ...chunk,
    id: kbChunkStorageId(chunk.slug, chunk.chunkIndex),
  }));
}