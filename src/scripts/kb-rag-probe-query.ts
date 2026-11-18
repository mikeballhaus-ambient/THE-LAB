import { databaseManager } from '@/backend/db/DatabaseManager';
import { initChroma } from '@/backend/chroma/chroma-init';
import { chroma } from '@/backend/chroma/chroma';
import { KB_CHUNKS_COLLECTION_NAME } from '@/shared/rag/kb-chunks-constants';
import { resolveUserEmbedProviderAdapter } from '@/backend/chroma/kb-rag-embed-provider';
import { embedTexts } from '@/backend/chroma/provider-embed';
import { KbChunksIndex } from '@/backend/chroma/kb-chunks-index';
import { resolveKbRagMinScore } from '@/shared/config/kb-rag-config';

const query = process.argv.slice(2).join(' ') || 'what can you tell me about theming tokens';

async function main(): Promise<void> {
  await databaseManager.initialize();
  await initChroma();

  const col = await chroma.getCollection({ name: KB_CHUNKS_COLLECTION_NAME });
  console.log('collection count:', await col.count());
  console.log('collection metadata:', await col.metadata);

  const embed = resolveUserEmbedProviderAdapter(1);
  if (!embed?.embed) {
    console.error('no embed provider for user 1');
    process.exitCode = 1;
    return;
  }

  const [qv] = await embedTexts([query], embed);
  const res = await col.query({
    queryEmbeddings: [qv],
    nResults: 5,
    include: ['documents', 'metadatas', 'distances', 'embeddings'],
  });

  const dists = res.distances?.[0] ?? [];
  const metas = (res.metadatas?.[0] ?? []) as Array<{ slug?: string }>;
  const embs = res.embeddings?.[0] ?? [];
  const minScore = resolveKbRagMinScore();

  console.log(`\nquery: ${query}`);
  console.log(`LAB_KB_RAG_MIN_SCORE=${minScore}\n`);

  for (let i = 0; i < dists.length; i++) {
    const d = dists[i] ?? 0;
    const score = 1 - d;
    const pass = score >= minScore;
    const embLen = Array.isArray(embs[i]) ? (embs[i] as number[]).length : 0;
    console.log(
      `#${i + 1} slug=${metas[i]?.slug ?? '?'} distance=${d} score=${score.toFixed(4)} pass=${pass} embReturned=${embLen}`,
    );
  }

  const hits = await KbChunksIndex.getInstance().queryTopK({
    query,
    k: 3,
    embedProvider: embed,
    minScore,
  });
  console.log(`\nqueryTopK hits: ${hits.length}`, hits.map((h) => `${h.slug}#${h.chunkIndex} score=${h.score.toFixed(4)}`));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});