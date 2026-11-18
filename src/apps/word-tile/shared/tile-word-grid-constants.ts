/**
 * Word Tile — canonical board constants.
 *
 * Single source of truth: the back-end rules engine and the browser both read
 * these, so they live in `shared/` and nobody re-declares them locally.
 */

/** 15×15 board (indices 0–14, matching the agent move schema). */
export const TILE_BOARD_SIZE = 15;

/** Tiles held on a rack. */
export const TILE_RACK_SIZE = 7;

/** Opening play must cover this cell. */
export const TILE_CENTER_ROW = 7;
export const TILE_CENTER_COL = 7;

/** Standard English letter distribution (100 tiles). */
export const TILE_BAG_LETTERS =
  'AAAAAAAAAABBCCDDDDEEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMMNNNNNNOOOOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ';

/** Face value per letter. */
export const TILE_LETTER_SCORES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};
