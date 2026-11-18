/** Dev-only presentation/sync counters (see finalized plan P0). */
export type BilliardsSyncDevCounterKey =
  | 'replayStarted'
  | 'replaySkipped'
  | 'replayAbandoned'
  | 'ackTimeout'
  | 'staleMatchDropped'
  | 'shotRejected';

export const billiardsSyncDevCounters: Record<BilliardsSyncDevCounterKey, number> = {
  replayStarted: 0,
  replaySkipped: 0,
  replayAbandoned: 0,
  ackTimeout: 0,
  staleMatchDropped: 0,
  shotRejected: 0,
};

export function bumpBilliardsSyncDevCounter(
  key: BilliardsSyncDevCounterKey,
  enabled: boolean,
): void {
  if (!enabled) {
    return;
  }
  billiardsSyncDevCounters[key] += 1;
}
