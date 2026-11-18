/** Wall-clock before a stuck human shot triggers {@link refreshMatch} (not an unlock). */
export const BILLIARDS_ACK_WATCHDOG_MS = 12_000;

export function serverShotsTakenAdvanced(
  baselineShotsTaken: number,
  nextShotsTaken: number,
): boolean {
  return nextShotsTaken > baselineShotsTaken;
}

export function shotAckClearsAfterStateAdvance(
  awaitingAck: boolean,
  baselineShotsTaken: number,
  nextShotsTaken: number,
): boolean {
  return awaitingAck && serverShotsTakenAdvanced(baselineShotsTaken, nextShotsTaken);
}
