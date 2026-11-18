import { KB_CHUNKS_COLLECTION_NAME } from '@/shared/rag/kb-chunks-constants';
import { chroma } from './chroma';

export async function initChroma() {
  await chroma.getOrCreateCollection({ name: 'chat-memory' });
  await chroma.getOrCreateCollection({
    name: KB_CHUNKS_COLLECTION_NAME,
    metadata: { 'hnsw:space': 'cosine' },
  });
}
