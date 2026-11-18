/**
 * User-facing copy for vs–Lab Assistant catalog games.
 *
 * Internal APIs keep `opponentKind: 'ai'` — this file is display strings only.
 */

/** Player-turns panel, status line, and opponent seat label in vs–Lab Assistant matches. */
export const LAB_ASSISTANT_GAME_OPPONENT_LABEL = 'Lab Assistant';

/** Lab brand flask (THE-LAB lockup, Sidecar, game lobbies) — tilt via `.lab-assistant-flask-icon`. */
export const LAB_ASSISTANT_FLASK_ICON_CLASSES = 'fa-solid fa-flask lab-assistant-flask-icon';

/** Lobby section title (replaces legacy “Play the AI”). */
export const GAME_LOBBY_LAB_ASSISTANT_SECTION_TITLE = 'Lab Assistant';

/** Primary lobby CTA button. */
export const GAME_LOBBY_PLAY_VS_LAB_ASSISTANT_BUTTON = 'Play vs Lab Assistant';

/** Default lead under the Lab Assistant lobby section. */
export const GAME_LOBBY_LAB_ASSISTANT_DEFAULT_LEAD =
  'Pick a difficulty and play against the Lab Assistant — same lab providers as chat, with in-game move instructions.';

/** Fallback subtitle on game lobby screens. */
export const GAME_LOBBY_OR_INVITE_FRIEND_TAGLINE =
  'Play vs the Lab Assistant or invite a friend.';

/** Blackjack vs dealer: seat-2 Lab Assistant (LLM); dealer remains house rules. */
export const BLACKJACK_LAB_ASSISTANT_TABLEMATE_LABEL = 'Lab Assistant';

export const BLACKJACK_LAB_ASSISTANT_TABLEMATE_PLAYING = 'Lab Assistant is playing…';

export const BLACKJACK_LAB_ASSISTANT_TABLEMATE_SECTION_LEAD =
  'You and a Lab Assistant tablemate each get a hand vs the same dealer — you play first, then the Lab Assistant seat, then the house settles. Quarks are yours alone; if you both lose, your loss is halved.';

/** Host context keys for Sidecar + future in-game banter (rm-57 games). */
export const LAB_SIDECAR_HOST_CTX_GAME_VIEW = 'gameView';
export const LAB_SIDECAR_HOST_CTX_GAME_ID = 'gameId';
export const LAB_SIDECAR_HOST_CTX_MATCH_ID = 'matchId';
export const LAB_SIDECAR_HOST_CTX_GAME_DIFFICULTY = 'gameDifficulty';

export const LAB_SIDECAR_GAME_VIEW_PLAY = 'play';
