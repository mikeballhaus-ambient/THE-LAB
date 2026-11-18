import type { Database } from 'better-sqlite3';
import {
  SOLITAIRE_GAME_IDS,
  type GameCatalogEntry,
  type GameRunPayload,
  type GameRunOutcome,
  type ScoreKind,
  type SubmitRunResult,
} from '../../shared/types';

/** In-app catalog (Solitaire ships a single game today). */
export const SOLITAIRE_GAME_CATALOG: ReadonlyArray<GameCatalogEntry> = [
  {
    id: SOLITAIRE_GAME_IDS.KLONDIKE,
    name: 'Klondike',
    description: 'Classic solitaire — clear all four foundations.',
    faIcon: 'fa-diamond',
    order: 1,
    scoreKind: 'time-lower',
    personalBest: null,
  },
];

function catalogEntry(gameId: string): GameCatalogEntry | undefined {
  return SOLITAIRE_GAME_CATALOG.find((g) => g.id === gameId);
}

function compareScore(scoreKind: ScoreKind, a: number, b: number): boolean {
  if (scoreKind === 'time-lower') {
    return a < b;
  }
  return a > b;
}

export class RunsService {
  constructor(private readonly db: Database) {}

  listCatalogForUser(labUserId: number): GameCatalogEntry[] {
    const bests = this.db
      .prepare(
        `SELECT game_id, primary_value, secondary_value
         FROM solitaire_personal_bests WHERE lab_user_id = ?`,
      )
      .all(labUserId) as {
      game_id: string;
      primary_value: number;
      secondary_value: number | null;
    }[];

    const bestByGame = new Map<string, { primary: number; secondary: number | null }>();
    for (const row of bests) {
      bestByGame.set(row.game_id, {
        primary: row.primary_value,
        secondary: row.secondary_value,
      });
    }

    return SOLITAIRE_GAME_CATALOG.map((game) => ({
      ...game,
      personalBest: bestByGame.get(game.id) ?? null,
    }));
  }

  submitRun(labUserId: number, payload: GameRunPayload): SubmitRunResult {
    const game = catalogEntry(payload.gameId);
    if (!game) {
      throw new Error('Unknown game');
    }

    const existing = this.db
      .prepare(`SELECT id FROM solitaire_runs WHERE run_id = ?`)
      .get(payload.runId) as { id?: number } | undefined;
    if (existing?.id) {
      return { accepted: true, personalBest: false };
    }

    const outcome: GameRunOutcome = payload.outcome;
    this.db
      .prepare(
        `INSERT INTO solitaire_runs (
          game_id, lab_user_id, outcome, primary_value, secondary_value,
          duration_ms, metadata_json, run_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        payload.gameId,
        labUserId,
        outcome,
        payload.primaryValue,
        payload.secondaryValue ?? null,
        payload.durationMs,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
        payload.runId,
      );

    const prior = this.db
      .prepare(
        `SELECT primary_value FROM solitaire_personal_bests
         WHERE lab_user_id = ? AND game_id = ? AND score_kind = ?`,
      )
      .get(labUserId, payload.gameId, game.scoreKind) as
      | { primary_value: number }
      | undefined;

    let personalBest = false;
    if (!prior || compareScore(game.scoreKind, payload.primaryValue, prior.primary_value)) {
      personalBest = true;
      this.db
        .prepare(
          `INSERT INTO solitaire_personal_bests (lab_user_id, game_id, score_kind, primary_value, secondary_value, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(lab_user_id, game_id, score_kind) DO UPDATE SET
             primary_value = excluded.primary_value,
             secondary_value = excluded.secondary_value,
             updated_at = datetime('now')`,
        )
        .run(
          labUserId,
          payload.gameId,
          game.scoreKind,
          payload.primaryValue,
          payload.secondaryValue ?? null,
        );
    }

    return { accepted: true, personalBest };
  }
}
