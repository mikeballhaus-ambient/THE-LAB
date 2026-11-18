/** Per-user background MCP connect (login / reconnect). */
export const mcpBackgroundConnectInFlight = new Set<number>();

const connectionErrors = new Map<string, string>();

export function mcpConnectionErrorKey(userId: number, serverId: number): string {
  return `${userId}:${serverId}`;
}

export function setMcpConnectionError(userId: number, serverId: number, message: string): void {
  connectionErrors.set(mcpConnectionErrorKey(userId, serverId), message);
}

export function clearMcpConnectionError(userId: number, serverId: number): void {
  connectionErrors.delete(mcpConnectionErrorKey(userId, serverId));
}

export function getMcpConnectionError(userId: number, serverId: number): string | undefined {
  return connectionErrors.get(mcpConnectionErrorKey(userId, serverId));
}

export function clearMcpConnectionErrorsForUser(userId: number): void {
  const prefix = `${userId}:`;
  for (const key of connectionErrors.keys()) {
    if (key.startsWith(prefix)) {
      connectionErrors.delete(key);
    }
  }
}
