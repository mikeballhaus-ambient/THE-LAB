/**
 * Shared game-platform UI kit.
 *
 * Generic lobby / match chrome used by every catalogue game. These components
 * carry **no** game-specific knowledge: each takes catalog entries, a match view,
 * or a player-turn list and renders it. A game's `App.vue` supplies wiring and its
 * own board; everything around the board comes from here.
 *
 * Promoted from `src/apps/word-tile/front-end/components/` once Word Tile stopped
 * being the only consumer — that directory is now empty.
 */
export { default as GameManagerLobby } from './GameManagerLobby.vue';
export { default as GamePlayShell } from './GamePlayShell.vue';
export { default as GameModePicker } from './GameModePicker.vue';
export { default as GameLobbyModePanel } from './GameLobbyModePanel.vue';
export { default as GameLobbyQuarksSection } from './GameLobbyQuarksSection.vue';
export { default as GameResultModal } from './GameResultModal.vue';
export { default as GameIcon } from './GameIcon.vue';
export { default as GameBoardRow } from './GameBoardRow.vue';
export { default as TurnTimerHud } from './TurnTimerHud.vue';
export { default as HumanMatchSeriesBar } from './HumanMatchSeriesBar.vue';
export { default as PlayerTurnsPanel } from './PlayerTurnsPanel.vue';
export { default as LabVirtualBankBadge } from './LabVirtualBankBadge.vue';
export { default as LabGameHintDevMockButton } from './LabGameHintDevMockButton.vue';
export { default as LabGameHintPurchaseButton } from './LabGameHintPurchaseButton.vue';
export { default as LabGameHintAsideControls } from './LabGameHintAsideControls.vue';
export { default as GamePracticeQuarksBanner } from './GamePracticeQuarksBanner.vue';
export { default as LabPlayingCard } from './LabPlayingCard.vue';

export type { PlayerTurn } from './player-turn';
export {
  cardToWireCode,
  parseCardCode,
  rankDisplay,
  suitSymbol,
  type LabCardSuit,
} from './lab-playing-card-code';
