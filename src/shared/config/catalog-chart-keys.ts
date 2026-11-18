/** Seeded Chart Builder keys for catalog apps (rm-64 phase 29). */

function hostPrefix(hostAppId: string): string {
  return hostAppId.replace(/^app-/, '');
}

export function catalogChartKey(hostAppId: string, slot: string): string {
  return `${hostPrefix(hostAppId)}.${slot}`;
}
