/**
 * Generic runs / personal-best / leaderboard / head-to-head service.
 *
 * Generalized from Word Tile's `RunsService` (tw_* tables) to work against any
 * app's prefix + catalog supplied via {@link GamePlatformConfig}.
 */
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { resolveMatchTableNames } from './match-schema';
import type {
  GamePlatformConfig,
  GameRunPayload,
  HumanHeadToHeadStats,
  ScoreKind,
} from './types';

function compareScore(scoreKind: ScoreKind, a: number, b: number): boolean {
  if (scoreKind === 'time-lower') {
    return a < b;
  }
  return a > b;
}

export class GameRunsService {
  constructor(
    private readonly db: Database,
    private readonly config: GamePlatformConfig,
  ) {}

  private get tables() {
    return resolveMatchTableNames(this.config.matchTablePrefix);
  }

  listCatalogForUser(labUserId: number) {
    const bests = this.db
      .prepare(
        `SELECT game_id, score_kind, primary_value, secondary_value
         FROM ${this.tables.personalBests} WHERE lab_user_id = ?`,
      )
      .all(labUserId) as {
      game_id: string;
      score_kind: string;
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

    return this.config.catalog.map((game) => ({
      ...game,
      personalBest: bestByGame.get(game.id) ?? null,
    }));
  }

  submitRun(
    labUserId: number,
    payload: GameRunPayload,
  ): { accepted: boolean; personalBest: boolean } {
    const game = this.config.catalog.find((g) => g.id === payload.gameId);
    if (!game) {
      throw new Error('Unknown game');
    }

    const existing = this.db
      .prepare(`SELECT id FROM ${this.tables.runs} WHERE run_id = ?`)
      .get(payload.runId) as { id?: number } | undefined;
    if (existing?.id) {
      return { accepted: true, personalBest: false };
    }

    this.db
      .prepare(
        `INSERT INTO ${this.tables.runs} (
          game_id, lab_user_id, difficulty, outcome, primary_value, agent_primary_value,
          secondary_value, duration_ms, metadata_json, run_id, opponent_kind, opponent_user_id, match_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        payload.gameId,
        labUserId,
        payload.difficulty ?? null,
        payload.outcome,
        payload.primaryValue,
        payload.agentPrimaryValue ?? null,
        payload.secondaryValue ?? null,
        payload.durationMs,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
        payload.runId,
        payload.opponentKind ?? null,
        payload.opponentUserId ?? null,
        payload.matchId ?? null,
      );

    const prior = this.db
      .prepare(
        `SELECT primary_value, secondary_value FROM ${this.tables.personalBests}
         WHERE lab_user_id = ? AND game_id = ? AND score_kind = ?`,
      )
      .get(labUserId, payload.gameId, game.scoreKind) as
      | { primary_value: number; secondary_value: number | null }
      | undefined;

    let personalBest = false;
    if (!prior || compareScore(game.scoreKind, payload.primaryValue, prior.primary_value)) {
      personalBest = true;
      this.db
        .prepare(
          `INSERT INTO ${this.tables.personalBests} (lab_user_id, game_id, score_kind, primary_value, secondary_value, updated_at)
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

  createRunId(): string {
    return randomUUID();
  }

  getHumanHeadToHeadStats(
    labUserId: number,
    opponentUserId: number,
    gameId: string,
  ): HumanHeadToHeadStats {
    const game = this.config.catalog.find((g) => g.id === gameId);
    if (!game) {
      throw new Error('Unknown game');
    }
    const rows = this.db
      .prepare(
        `SELECT outcome, COUNT(*) AS count
         FROM ${this.tables.runs}
         WHERE lab_user_id = ? AND game_id = ? AND opponent_kind = 'human' AND opponent_user_id = ?
         GROUP BY outcome`,
      )
      .all(labUserId, gameId, opponentUserId) as { outcome: string; count: number }[];

    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (const row of rows) {
      const n = Number(row.count) || 0;
      if (row.outcome === 'win') {
        wins = n;
      } else if (row.outcome === 'loss') {
        losses = n;
      } else if (row.outcome === 'draw') {
        draws = n;
      }
    }
    return {
      gameId,
      opponentUserId,
      wins,
      losses,
      draws,
      totalGames: wins + losses + draws,
    };
  }
}
