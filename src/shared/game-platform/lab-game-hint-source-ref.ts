/** Idempotent ledger keys for per-boundary hint purchases. */

export function buildLabGameHintSourceRef(options: {
  hostAppId: string;
  skuId: string;
  matchId: string;
  turnKey: string | number;
}): string {
  return `hint:${options.hostAppId}:${options.skuId}:match:${options.matchId}:turn:${options.turnKey}`;
}

export function buildBilliardsShotPathHintSourceRef(options: {
  matchId: string;
  seat: number;
  shotAttempt: number;
}): string {
  return buildLabGameHintSourceRef({
    hostAppId: 'app-billiards',
    skuId: 'shot-path',
    matchId: options.matchId,
    turnKey: `${options.seat}:shot:${options.shotAttempt}`,
  });
}
