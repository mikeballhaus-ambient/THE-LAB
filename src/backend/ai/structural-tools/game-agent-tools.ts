import {
  WORD_TILE_AGENT_PURPOSE_SUFFIX,
  WORD_TILE_AGENT_TOOL,
} from '@/apps/word-tile/shared/agent-tool';
import {
  TIC_TAC_TOE_AGENT_PURPOSE_SUFFIX,
  TIC_TAC_TOE_AGENT_TOOL,
} from '@/apps/tic-tac-toe/shared/agent-tool';
import {
  CHECKERS_AGENT_PURPOSE_SUFFIX,
  CHECKERS_AGENT_TOOL,
} from '@/apps/checkers/shared/agent-tool';
import { CHESS_AGENT_PURPOSE_SUFFIX, CHESS_AGENT_TOOL } from '@/apps/chess/shared/agent-tool';
import {
  CONNECT_FOUR_AGENT_PURPOSE_SUFFIX,
  CONNECT_FOUR_AGENT_TOOL,
} from '@/apps/connect-four/shared/agent-tool';
import {
  BATTLESHIP_AGENT_PURPOSE_SUFFIX,
  BATTLESHIP_AGENT_TOOL,
} from '@/apps/battleship/shared/agent-tool';
import { HANGMAN_AGENT_PURPOSE_SUFFIX, HANGMAN_AGENT_TOOL } from '@/apps/hangman/shared/agent-tool';
import {
  POKER_AGENT_PURPOSE_SUFFIX,
  POKER_AGENT_TOOL,
} from '@/apps/poker-holdem/shared/agent-tool';
import {
  BLACKJACK_AGENT_PURPOSE_SUFFIX,
  BLACKJACK_AGENT_TOOL,
} from '@/apps/blackjack/shared/agent-tool';
import {
  BILLIARDS_AGENT_PURPOSE_SUFFIX,
  BILLIARDS_AGENT_TOOL,
  BILLIARDS_PLACE_CUE_TOOL,
} from '@/apps/billiards/shared/agent-tool';
import type { StructuralToolDescriptor } from './platform-structural-tool-registry';

/**
 * Every catalogue game's structural tool, as **described by the app that owns it**.
 *
 * Core contributes no schema and no game grammar here — it only enumerates the
 * apps that offer a tool so boot can register them. Adding a game means adding one
 * line below plus the two files in that app's `shared/`.
 *
 * Registering an app module directly is the established pattern for app *data*
 * that must exist at boot (cf. `src/backend/platform/app-seed-data-direct.ts`).
 * What core must not do is *host* the schema.
 */
export interface GameAgentToolEntry {
  appId: string;
  descriptor: StructuralToolDescriptor;
  /** Purpose suffix, e.g. `.chess.agent-turn`. */
  purposeSuffix: string;
}

export const GAME_AGENT_TOOLS: readonly GameAgentToolEntry[] = [
  { appId: 'app-word-tile', descriptor: WORD_TILE_AGENT_TOOL, purposeSuffix: WORD_TILE_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-tic-tac-toe', descriptor: TIC_TAC_TOE_AGENT_TOOL, purposeSuffix: TIC_TAC_TOE_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-checkers', descriptor: CHECKERS_AGENT_TOOL, purposeSuffix: CHECKERS_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-chess', descriptor: CHESS_AGENT_TOOL, purposeSuffix: CHESS_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-connect-four', descriptor: CONNECT_FOUR_AGENT_TOOL, purposeSuffix: CONNECT_FOUR_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-battleship', descriptor: BATTLESHIP_AGENT_TOOL, purposeSuffix: BATTLESHIP_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-hangman', descriptor: HANGMAN_AGENT_TOOL, purposeSuffix: HANGMAN_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-poker-holdem', descriptor: POKER_AGENT_TOOL, purposeSuffix: POKER_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-blackjack', descriptor: BLACKJACK_AGENT_TOOL, purposeSuffix: BLACKJACK_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-billiards', descriptor: BILLIARDS_AGENT_TOOL, purposeSuffix: BILLIARDS_AGENT_PURPOSE_SUFFIX },
  { appId: 'app-billiards', descriptor: BILLIARDS_PLACE_CUE_TOOL, purposeSuffix: BILLIARDS_AGENT_PURPOSE_SUFFIX },
];
