/**
 * Manual full reconcile for published KB → kb-chunks (dev / CI).
 *
 *   cd the-lab && npm run kb-rag:reindex
 *   cd the-lab && npm run kb-rag:reindex -- --force
 *
 * Requires: platform SQLite (user embed config), Chroma on 127.0.0.1:8000, embed backend reachable.
 */

import { databaseManager } from '@/backend/db/DatabaseManager';
import { initChroma } from '@/backend/chroma/chroma-init';
import { reconcileKbChunksIndex } from '@/backend/chroma/kb-chunks-reconcile';
import { resolveKbRagEmbedUserId } from '@/shared/config/kb-rag-config';

const force = process.argv.includes('--force');

function printNoEmbedHelp(userId: number): void {
  console.error(`kb-rag:reindex failed: no_embed_provider (LAB_KB_RAG_EMBED_USER_ID=${userId})`);
  console.error(
    'Fix: In THE-LAB Settings, save an embed provider for that user (or set LAB_KB_RAG_EMBED_USER_ID to your user id).',
  );
  console.error('Ensure LM Studio / Ollama / OpenAI embed is running at the configured base URL.');
}

async function main(): Promise<void> {
  await databaseManager.initialize();

  try {
    await initChroma();
  } catch {
    console.error(
      'kb-rag:reindex failed: chroma_unavailable — start Chroma first:',
    );
    console.error('  npm run lab:services   # recommended on Windows (detached Chroma on :8000)');
    console.error('  npm run chroma         # foreground, if THE_LAB_CHROMA_BIN / Python chroma.exe is set');
    process.exitCode = 1;
    return;
  }

  const embedUserId = resolveKbRagEmbedUserId();
  const result = await reconcileKbChunksIndex({
    force,
    embedUserId,
  });

  if (!result.ok) {
    if (result.reason === 'no_embed_provider') {
      printNoEmbedHelp(embedUserId);
    } else if (result.reason === 'db_unavailable') {
      console.error(
        'kb-rag:reindex failed: db_unavailable — open the Knowledge Base app once so its SQLite exists.',
      );
    } else {
      console.error(`kb-rag:reindex failed: ${result.reason}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `kb-rag:reindex ok articles=${result.articles} reindexed=${result.reindexed} unchanged=${result.unchanged}${force ? ' (force)' : ''}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    databaseManager.close();
  });