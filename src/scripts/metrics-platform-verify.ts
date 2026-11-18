/**
 * rm-46 **2.6** — local verification for template cache + repo file index.
 * Run: npx tsx src/scripts/metrics-platform-verify.ts
 */
import { databaseManager } from '@/backend/db/DatabaseManager';
import { TemplateManager, clearTemplateMarkdownCacheForTests } from '@/backend/utils/template-manager';
import {
  fileHelpers,
  getFetchRepoFilesCallCount,
  resetFetchRepoFilesCallCount,
} from '@/backend/utils/file-helpers';

async function measureTemplateInit(userId: number): Promise<number> {
  const started = performance.now();
  await new TemplateManager(userId).init();
  const ms = performance.now() - started;
  return Math.round(ms * 10) / 10;
}

async function main(): Promise<void> {
  await databaseManager.initialize();
  const userId = 1;

  clearTemplateMarkdownCacheForTests();
  const coldMs = await measureTemplateInit(userId);
  const warmMs = await measureTemplateInit(userId);

  resetFetchRepoFilesCallCount();
  const calls = 10;
  for (let i = 0; i < calls; i += 1) {
    await fileHelpers.fetchRepoFiles();
  }
  const scanCount = getFetchRepoFilesCallCount();

  console.log(JSON.stringify({ coldMs, warmMs, fetchRepoFilesCallsFor10Invocations: scanCount }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
