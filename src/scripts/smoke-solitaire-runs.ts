/**
 * Smoke: solitaire RunsService submitRun + idempotent replay.
 * Usage: npx tsx src/scripts/smoke-solitaire-runs.ts
 */
import { randomUUID } from 'node:crypto';
import { AppDatabaseServiceProxy } from '@/apps/solitaire/db/app-db-service';
import { runSolitaireDbBootstrap } from '@/apps/solitaire/back-end/db/bootstrap';
import { RunsService } from '@/apps/solitaire/back-end/services/runs-service';
import { SOLITAIRE_GAME_IDS } from '@/apps/solitaire/shared/types';

const LAB_USER_ID = 1;

async function main(): Promise<void> {
  const proxy = AppDatabaseServiceProxy.getInstance();
  await proxy.initialize();
  await runSolitaireDbBootstrap(proxy);

  const runs = new RunsService(proxy.getDb());
  const runId = randomUUID();

  const first = runs.submitRun(LAB_USER_ID, {
    gameId: SOLITAIRE_GAME_IDS.KLONDIKE,
    outcome: 'win',
    primaryValue: 120_000,
    secondaryValue: 42,
    durationMs: 120_000,
    runId,
  });

  const second = runs.submitRun(LAB_USER_ID, {
    gameId: SOLITAIRE_GAME_IDS.KLONDIKE,
    outcome: 'win',
    primaryValue: 120_000,
    secondaryValue: 42,
    durationMs: 120_000,
    runId,
  });

  const row = proxy.getDb().prepare('SELECT COUNT(*) AS c FROM solitaire_runs WHERE run_id = ?').get(runId) as {
    c: number;
  };

  const catalog = runs.listCatalogForUser(LAB_USER_ID);
  const klondike = catalog.find((g) => g.id === SOLITAIRE_GAME_IDS.KLONDIKE);

  console.log(JSON.stringify({
    first,
    second,
    runRows: row.c,
    personalBest: klondike?.personalBest,
  }, null, 2));

  if (row.c !== 1 || !first.accepted || !second.accepted) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
