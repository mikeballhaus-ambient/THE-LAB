/**
 * Player-turns feed entries for billiards vs matches — same “moments” as Sidecar banter,
 * not every layout tweak or dry miss.
 */
export function isBilliardsPlayerTurnFeedWorthy(summary: string): boolean {
  const text = summary.trim();
  if (!text) {
    return false;
  }
  if (/^cue ball placed/i.test(text)) {
    return false;
  }
  if (/^practice started/i.test(text)) {
    return false;
  }

  const lower = text.toLowerCase();

  if (
    lower.includes('ball in hand') ||
    lower.includes('scratch') ||
    lower.includes('wrong ball') ||
    lower.includes('eight ball first') ||
    lower.includes('did not hit')
  ) {
    return true;
  }

  if (
    lower.includes('eight ball') ||
    lower.includes('pocket the 8') ||
    lower.includes('you win') ||
    lower.includes('you lose') ||
    lower.includes('pocket the 9')
  ) {
    return true;
  }

  if (lower.includes('pocketed')) {
    return true;
  }

  /** Group claim on an open table (matches banter “claimed solids/stripes”). */
  if (/ — (solids|stripes) for /i.test(text)) {
    return true;
  }

  /** Legal shot, no pocket, no foul — omit from feed (banter returns null too). */
  if (/^shot\b/i.test(text) && !lower.includes('pocketed') && !/ — (solids|stripes) for /i.test(text)) {
    return false;
  }

  return false;
}
