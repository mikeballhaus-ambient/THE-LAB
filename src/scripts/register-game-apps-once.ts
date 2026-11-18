/**
 * Additive registry insert for the catalogue game apps.
 *
 * Idempotent: an app already present is reported and skipped, never modified or
 * deleted. This is the same data path as App Management's create_app (registry
 * row + `games` catalog tag + per-app DB), so it is safe to run against a live DB.
 *
 * Usage:
 *   npx tsx src/scripts/register-game-apps-once.ts            # all
 *   npx tsx src/scripts/register-game-apps-once.ts app-chess  # one
 */
import { databaseManager } from '@/backend/db/DatabaseManager';
import { appsService } from '@/backend/db/Apps/apps-service';
import { ensureCatalogTagsAndLinkApp } from '@/backend/db/AppTags/ensure-catalog-tags-for-app';
import {
  battleshipAppInstructions,
  checkersAppInstructions,
  chessAppInstructions,
  connectFourAppInstructions,
  hangmanAppInstructions,
  pokerHoldemAppInstructions,
  ticTacToeAppInstructions,
  blackjackAppInstructions,
} from '@/backend/db/Apps/app-instructions/shared-games-app-instructions';
import { billiardsAppInstructions } from '@/backend/db/Apps/app-instructions/billiards-app-instructions';
import { solitaireAppInstructions } from '@/backend/db/Apps/app-instructions/solitaire-app-instructions';
import { SOLITAIRE_APP_DESCRIPTION } from '@/backend/db/Apps/catalog-app-registration-specs';
import { wordTileAppInstructions } from '@/backend/db/Apps/app-instructions/word-tile-app-instructions';
import type { IApp } from '@/shared/types/app/app.d';
import { AppDatabaseService } from '@/backend/AppDatabaseService';

interface GameAppSpec {
  id: string;
  /** Slug = src/apps/{slug} and AppDatabaseService host id. */
  slug: string;
  name: string;
  description: string;
  order: number;
  faIcon: string;
  port: number;
  instructions: string;
  tags: string[];
}

/**
 * Ports mirror the registry defaults already documented per app (4101-4109).
 * Order is the catalog display order.
 */
const GAME_APPS: GameAppSpec[] = [
  {
    id: 'app-solitaire',
    slug: 'solitaire',
    name: 'Solitaire',
    description: SOLITAIRE_APP_DESCRIPTION,
    order: 21,
    faIcon: 'fa-clone',
    port: 4101,
    instructions: solitaireAppInstructions,
    tags: ['games', 'solitaire'],
  },
  {
    id: 'app-word-tile',
    slug: 'word-tile',
    name: 'Word Tile',
    description: 'Turn-based tile word grid — vs Lab Assistant or invite a friend.',
    order: 22,
    faIcon: 'fa-table-cells-large',
    port: 4102,
    instructions: wordTileAppInstructions,
    tags: ['games', 'word-tile'],
  },
  {
    id: 'app-checkers',
    slug: 'checkers',
    name: 'Checkers',
    description: 'Checkers — vs Lab Assistant or friend.',
    order: 23,
    faIcon: 'fa-chess-board',
    port: 4103,
    instructions: checkersAppInstructions,
    tags: ['games', 'checkers'],
  },
  {
    id: 'app-chess',
    slug: 'chess',
    name: 'Chess',
    description: 'Chess — vs Lab Assistant or friend.',
    order: 24,
    faIcon: 'fa-chess',
    port: 4104,
    instructions: chessAppInstructions,
    tags: ['games', 'chess'],
  },
  {
    id: 'app-hangman',
    slug: 'hangman',
    name: 'Hangman',
    description: 'Hangman — guess the word.',
    order: 25,
    faIcon: 'fa-user-secret',
    port: 4105,
    instructions: hangmanAppInstructions,
    tags: ['games', 'hangman'],
  },
  {
    id: 'app-connect-four',
    slug: 'connect-four',
    name: 'Connect Four',
    description: 'Connect Four.',
    order: 26,
    faIcon: 'fa-circle',
    port: 4106,
    instructions: connectFourAppInstructions,
    tags: ['games', 'connect-four'],
  },
  {
    id: 'app-battleship',
    slug: 'battleship',
    name: 'Battleship',
    description: 'Battleship — sink the fleet.',
    order: 27,
    faIcon: 'fa-ship',
    port: 4107,
    instructions: battleshipAppInstructions,
    tags: ['games', 'battleship'],
  },
  {
    id: 'app-poker-holdem',
    slug: 'poker-holdem',
    name: "Texas Hold'em",
    description: 'Heads-up Texas Hold\'em — play money.',
    order: 28,
    faIcon: 'fa-diamond',
    port: 4108,
    instructions: pokerHoldemAppInstructions,
    tags: ['games', 'poker-holdem'],
  },
  {
    id: 'app-tic-tac-toe',
    slug: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Tic-Tac-Toe — local and vs friend.',
    order: 29,
    faIcon: 'fa-xmark',
    port: 4109,
    instructions: ticTacToeAppInstructions,
    tags: ['games', 'tic-tac-toe'],
  },
  {
    id: 'app-blackjack',
    slug: 'blackjack',
    name: 'Blackjack',
    description: 'Blackjack — you vs the dealer, or heads-up vs a friend.',
    order: 30,
    faIcon: 'fa-heart',
    port: 4117,
    instructions: blackjackAppInstructions,
    tags: ['games', 'blackjack'],
  },
  {
    id: 'app-billiards',
    slug: 'billiards',
    name: 'Billiards',
    description: 'Practice table, 8-ball vs Lab Assistant, or friend.',
    order: 31,
    faIcon: 'fa-circle',
    port: 4119,
    instructions: billiardsAppInstructions,
    tags: ['games', 'billiards'],
  },
];

function toApp(spec: GameAppSpec): IApp {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    type: 'hybrid',
    componentPath: `/src/apps/${spec.slug}/front-end/App.vue`,
    isServerSideEnabled: true,
    isEnabled: true,
    order: spec.order,
    faIcon: spec.faIcon,
    server: {
      entry: `/src/apps/${spec.slug}/back-end/entry.ts`,
      port: spec.port,
      env: { NODE_ENV: 'development' },
    },
    dependencies: [],
    optionalDependencies: [],
    requiresPort: spec.port,
    version: '1.0.0',
    latestVersion: '1.0.0',
    isUpdateAvailable: false,
    metadata: {
      author: 'developer',
      version: '1.0.0',
      tags: spec.tags,
      category: 'Custom',
    },
    changelog: [],
    appSystemInstructions: spec.instructions,
    isSystem: false,
  };
}

async function main(): Promise<void> {
  const only = process.argv[2];
  const specs = only ? GAME_APPS.filter((s) => s.id === only) : GAME_APPS;
  if (!specs.length) {
    console.error(`Unknown app id: ${only}`);
    console.error(`Known: ${GAME_APPS.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  await databaseManager.initialize();

  let created = 0;
  let skipped = 0;

  for (const spec of specs) {
    const existing = appsService.getAppById(spec.id);
    if (existing) {
      console.log(`skip   ${spec.id} (already registered, port ${existing.server?.port ?? 'n/a'})`);
      skipped += 1;
      continue;
    }

    appsService.createApp(toApp(spec));
    ensureCatalogTagsAndLinkApp(spec.id, [{ id: 'games' }]);

    // Per-app DB is created lazily by the app server; touching it here proves the
    // host id resolves and the proxy can open the file.
    const db = await AppDatabaseService.getInstance(spec.slug);
    console.log(`create ${spec.id} (port ${spec.port}, db ok: ${db.isValid()})`);
    created += 1;
  }

  console.log(`\nDone. created=${created} skipped=${skipped} total=${specs.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
