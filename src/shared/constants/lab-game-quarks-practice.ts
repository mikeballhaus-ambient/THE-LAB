/** Appended to result copy when `MatchView.practice` is true. */
export const LAB_GAME_QUARKS_PRACTICE_RESULT_NOTE =
  ' Practice mode — Quarks were simulated; your wallet was not changed.';

/** @deprecated Use {@link GAME_LOBBY_QUARKS_OPT_IN_LEAD} for card-game lobbies. */
export const GAME_LOBBY_QUARKS_PRACTICE_LEAD =
  'Bets, pots, and payouts play out normally in the UI. When practice is on, your real Quarks balance is not debited or credited.';

/** Card games — opt in before real ledger settlement (checkbox off by default). */
export const GAME_LOBBY_QUARKS_OPT_IN_LEAD =
  'Bets and pots play out in the UI every time. Turn on the option below only when you want wins and losses to change your real Quarks balance.';

export const GAME_LOBBY_QUARKS_OPT_IN_LABEL =
  'Play for Quarks — wins and losses update your wallet';

/** Optional vs–Lab Assistant frame wager (e.g. Billiards). */
export const GAME_LOBBY_QUARKS_WAGER_LEAD =
  'Optional frame stake when you play vs Lab Assistant. The amount is fixed per difficulty below. Off by default — win earns the stake, loss costs it.';

/** Friend-invite section lead for catalog games with optional frame wager. */
export const GAME_LOBBY_INVITE_FRAME_WAGER_LEAD =
  'Send a Lab Messages invite; optional Quarks wager shows on the card before they accept.';

/** Append to game-specific invite rules copy (e.g. billiards table rules). */
export const GAME_LOBBY_INVITE_FRAME_WAGER_SUFFIX =
  ' Optional Quarks wager — your invite shows the stake before they accept.';

/** Lobby checkbox on → match is not practice; off → `rules.practice` (no ledger). */
export function lobbyMatchPracticeFromQuarksOptIn(realPlayOptIn: boolean): boolean {
  return !realPlayOptIn;
}
