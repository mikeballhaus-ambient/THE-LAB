/** Development status for a key result (superset of OKR conventions). */
export type KeyResultStatus = 'not-started' | 'on-track' | 'at-risk' | 'done';

export interface Objective {
  id: number;
  title: string;
  ownerName: string;
  /** Platform user id when the owner was picked from the lookup (phase 31). */
  ownerId?: number | null;
  quarter: string;
  createdAt: string;
}

export interface KeyResult {
  id: number;
  objectiveId: number;
  title: string;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  status: KeyResultStatus;
  order: number;
}

/** Objective with its KRs and a roll-up progress percentage (0–100). */
export interface ObjectiveWithKeyResults extends Objective {
  keyResults: KeyResult[];
  progress: number;
}

export interface UpsertObjectiveInput {
  title: string;
  ownerName: string;
  ownerId?: number | null;
  quarter: string;
}

export interface UpsertKeyResultInput {
  objectiveId: number;
  title: string;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  status: KeyResultStatus;
}

/**
 * Body for `PUT /api/okr/key-results/:id`.
 *
 * The id is in the path and `objectiveId` is immutable — the server schema omits it
 * (`KeyResultUpdateSchema = KeyResultSchema.omit({ objectiveId: true })`), so the update shape
 * is deliberately narrower than the create shape. Callers should not have to invent an
 * `objectiveId` just to satisfy the type.
 */
export type UpdateKeyResultInput = Omit<UpsertKeyResultInput, 'objectiveId'>;
