export type BilliardsPhase = 'setup' | 'place_cue' | 'aim' | 'rolling' | 'finished';

export type BilliardsPlacementZone = 'table' | 'kitchen';

/** `free` = open practice (layout, no win rules). Competitive modes use eight-ball or nine-ball. */
export type BilliardsRulesProfile = 'free' | 'eight-ball' | 'nine-ball';

export type BilliardsPlayerGroup = 'open' | 'solids' | 'stripes';

/** Assigned object-ball group for a seat in eight-ball (null = not yet assigned). */
export type BilliardsAssignedGroup = 'solids' | 'stripes';

export interface BilliardsSeatGroups {
  1: BilliardsAssignedGroup | null;
  2: BilliardsAssignedGroup | null;
}

export const OPEN_BILLIARDS_SEAT_GROUPS: BilliardsSeatGroups = { 1: null, 2: null };

export interface BilliardsBall {
  id: string;
  /** 0 = cue ball; 1–15 object balls */
  number: number;
  x: number;
  y: number;
  pocketed: boolean;
  /** Competitive play: seat that legally pocketed this ball. */
  pocketedBySeat?: number | null;
}

export interface BilliardsTurnHistoryEntry {
  seat: number;
  summary: string;
}

/** Server stamp so the client can replay the last shot (especially the Lab Assistant). */
export interface BilliardsLastShotReplay {
  seat: number;
  angleRad: number;
  power: number;
  englishX: number;
  englishY: number;
  shotsTaken: number;
  /** Layout immediately before the shot was simulated (authoritative). */
  preShotBalls: BilliardsBall[];
  /** Payload already includes break variance from `resolveShotForSimulation` on the server. */
  shotVarianceResolved: boolean;
}

/** Server stamp so the client can animate opponent ball-in-hand placement. */
export interface BilliardsLastCuePlaceReplay {
  seat: number;
  x: number;
  y: number;
  placementZone: BilliardsPlacementZone;
  historyIndex: number;
  /** Ball layout immediately before the cue was placed (authoritative). */
  prePlaceBalls: BilliardsBall[];
}

export interface BilliardsMatchState {
  phase: BilliardsPhase;
  layoutLocked: boolean;
  rulesProfile: BilliardsRulesProfile;
  balls: BilliardsBall[];
  ballInHand: boolean;
  /** Seat allowed to place the cue after a foul (competitive). */
  ballInHandSeat: number | null;
  placementZone: BilliardsPlacementZone;
  turnHistory: BilliardsTurnHistoryEntry[];
  /** Shots taken since layout lock (for break foul kitchen). */
  shotsTaken: number;
  /** Eight-ball per-seat assignment; both null while the table is open. */
  seatGroups: BilliardsSeatGroups;
  /**
   * @deprecated Legacy single-table group — migrate via {@link normalizeBilliardsSeatGroups}.
   */
  playerGroup?: BilliardsPlayerGroup | null;
  /** Set when phase is `finished`. */
  resultMessage: string | null;
  /** 1 = player won practice frame; null = loss or incomplete. */
  winnerSeat: number | null;
  lastShotReplay?: BilliardsLastShotReplay | null;
  lastCuePlaceReplay?: BilliardsLastCuePlaceReplay | null;
  /** Competitive shots: who shoots next when phase is `aim` (no ball in hand). */
  continueTurnSeat?: number | null;
  /** Vs–Lab Assistant frame wager (Quarks); settled when `phase` is `finished`. */
  wagerQuarks?: number;
  /** Seeded rack + break perturbation; set whenever an auto rack is built. */
  physicsVarianceSeed?: number;
}

export interface BilliardsShotPayload {
  angleRad: number;
  power: number;
  englishX: number;
  englishY: number;
  cueBallX?: number;
  cueBallY?: number;
}

export const TABLE_WIDTH = 1000;
export const TABLE_HEIGHT = 500;
/**
 * Ball radius in table units.
 *
 * Chosen so the **playing surface measures 39.1 ball-diameters long**, i.e. an 8-ft home table. Real
 * proportions: every standard table is 2:1 with 2.25" balls, so a table's size *is* its length in balls —
 * 34.7 for a 7-ft bar box, 39.1 for an 8-ft, 44.4 for a 9-ft pro. The playfield here is 927.5 units nose to
 * nose, so `927.5 / 39.1 / 2 ≈ 11.86`.
 *
 * At the old 17 the playfield was only 27.3 balls long — shorter than any real table, which made everything
 * feel cramped and the balls oversized.
 */
export const BALL_RADIUS = 11.86;
/** Corner mouth radius — kept for callers that want a single representative pocket size. */
export const POCKET_RADIUS = BALL_RADIUS * 2;
/** Cushion rail thickness (table units) — inner play inset. */
export const TABLE_RAIL_INSET = 30;
/** Outer wood apron (table units) — chrome frame + pocket placement reference. */
export const TABLE_WOOD_RAIL = 58;
/** SVG / edge paint bleed so apron, corners, and sights are not clipped at x=0 / y=0. */
export const TABLE_CHROME_BLEED = 14;
/**
 * Bumper band outset from the cloth line — how deep the visible rubber sits behind the cushion nose.
 *
 * **Must be at least the pocket stub depth (7.6).** The stubs are the deepest part of the cushion line, so
 * with a shallower outset the last few units of the stub have no rubber behind them and poke out past the
 * bumper as a bare nub at the end of the straight run. 8 keeps every stub tucked inside the band.
 */
export const TABLE_BUMPER_OUTSET = 8;
/** Cushion nose overhang onto playing cloth (`table-rail-bumpers.ts`). */
export const TABLE_BUMPER_NOSE = 3;
/**
 * Shift bumper bands + nose/collider geometry **inboard** toward table centre (table units).
 * **Negative** shifts outward (toward wood / wider pocket mouths). Shared by SVG chrome,
 * `table-bumper-physics.ts`, and Rapier segments from `table-rail-bumpers`.
 */
export const TABLE_BUMPER_BAND_INSET_TOWARD_CENTER = 5;
/**
 * Nudge **left/right** cushion nose + outer edge **outward** toward the wood (table units).
 * Top/bottom rails unchanged — tunes vertical rail colliders to meet corner pocket miters.
 */
export const TABLE_BUMPER_SIDE_RAIL_OUTER_SHIFT = 2;
/** Pocket mouth clearance on bumper segments (`table-rail-bumpers.ts`). */
export const TABLE_BUMPER_POCKET_CUT_PAD = 4;
/** Diamond sights on outer wood face (table units from top/left table edge). */
export const TABLE_APRON_SIGHT_OFFSET = TABLE_WOOD_RAIL * 0.38;
/** Outer rail corner radius (table units). */
export const TABLE_CORNER_RADIUS = 66;
/** Match `BilliardsTable.vue` felt clipping to SVG wood corners. */
export const TABLE_CHROME_RADIUS_X_PERCENT = (TABLE_CORNER_RADIUS / TABLE_WIDTH) * 100;
export const TABLE_CHROME_RADIUS_Y_PERCENT = (TABLE_CORNER_RADIUS / TABLE_HEIGHT) * 100;
/**
 * Playing cloth corner radius (table units).
 *
 * **Zero — the cloth corner is square.**
 *
 * A convex rounded corner curves *away* from the corner pocket, leaving a crescent of felt
 * sitting between the cloth edge and the hole. That is geometrically backwards: on a real
 * table the cloth runs square into the corner and the pocket circle bites a **concave** arc
 * out of it, so the cushion wraps the jaw instead of retreating from it.
 *
 * The aperture is then defined entirely by the pocket cut-out circles
 * (`pocketMaskCircles`), which is the single source of truth for the hole shape.
 */
export const TABLE_CLOTH_CORNER_RADIUS = 0;

/** Pocket center distance from table corner along x/y (larger = toward table center, deeper in wood apron). */
export const CORNER_POCKET_CENTER_AXIS = 36;
/** Side pocket center inset from top/bottom edge (toward table center). */
export const SIDE_POCKET_CENTER_AXIS = 32;

/** Pocket centers in table coordinates (simulation + SVG chrome). */
export const TABLE_POCKET_CENTERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: CORNER_POCKET_CENTER_AXIS, y: CORNER_POCKET_CENTER_AXIS },
  { x: TABLE_WIDTH / 2, y: SIDE_POCKET_CENTER_AXIS },
  { x: TABLE_WIDTH - CORNER_POCKET_CENTER_AXIS, y: CORNER_POCKET_CENTER_AXIS },
  { x: CORNER_POCKET_CENTER_AXIS, y: TABLE_HEIGHT - CORNER_POCKET_CENTER_AXIS },
  { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT - SIDE_POCKET_CENTER_AXIS },
  { x: TABLE_WIDTH - CORNER_POCKET_CENTER_AXIS, y: TABLE_HEIGHT - CORNER_POCKET_CENTER_AXIS },
];
/** Head string — kitchen is above this y (lower y = top of screen / head rail). */
export const HEAD_STRING_Y = TABLE_HEIGHT * 0.25;

export const MAX_CUE_PULL_PX = 120;
/** Distance from cue ball center to the 0% end of the power meter (along the cue). */
export const CUE_POWER_STEM_PX = 40;
/** Full cue length on the table (~58 in cue vs ~100 in playing surface). */
export const CUE_VISUAL_LENGTH_PX = 560;
/** Gray chrome padding around the felt in the UI (`BilliardsTable.vue`). */
export const TABLE_STAGE_CHROME_PADDING_PX = 50;
/** Playfield matches table coordinates (0…TABLE_WIDTH × 0…TABLE_HEIGHT). */
export const STAGE_WIDTH = TABLE_WIDTH;
export const STAGE_HEIGHT = TABLE_HEIGHT;
/** @deprecated Gutter is CSS padding on the stage; kept at 0 for coordinate helpers. */
export const TABLE_GUTTER_LEFT = 0;
export const TABLE_GUTTER_RIGHT = 0;
export const TABLE_GUTTER_TOP = 0;
export const TABLE_GUTTER_BOTTOM = 0;
/** Power grip travels along the visible shaft (from tip toward butt). */
export const CUE_POWER_GRIP_MIN_FROM_TIP_PX = 28;
export const CUE_POWER_GRIP_MAX_FROM_TIP_PX = CUE_VISUAL_LENGTH_PX - 36;
/** Default cue power after each shot (keeps the grip handle on-screen). */
export const DEFAULT_PULL_POWER = 0.1;
/**
 * Initial cue-ball speed (table units per second) at normalized power 1.0.
 * Shared by authoritative Rapier sim and client roll preview.
 */
export const BILLIARDS_MAX_CUE_SPEED = 2400;
