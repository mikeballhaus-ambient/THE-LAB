/** Platform-seeded MCP servers (edit/delete restricted; toggle restricted to owner/admin). */
export const SEEDED_MCP_SERVER_NAMES = [
  'datetime',
  'the-lab-db',
  'neural-memory',
] as const;

export function isSeededMcpServerName(name: string): boolean {
  return (SEEDED_MCP_SERVER_NAMES as readonly string[]).includes(name);
}

export function canToggleSeededMcpServer(role: string | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
