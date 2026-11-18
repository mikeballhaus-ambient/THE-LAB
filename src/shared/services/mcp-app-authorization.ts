import type { User } from '@/shared/types/user';

export function userCanUpdateApp(user: User | null | undefined, appId: string): boolean {
  const perms = user?.permissions?.app?.find((p) => p.appId === appId);
  return !!perms?.canUpdate;
}

export function resolveTargetAppIdsFromToolParams(toolId: string, params: Record<string, unknown>): string[] {
  const ids = new Set<string>();

  if (toolId.startsWith('app_management_')) {
    for (const key of ['appId', 'app_id', 'id']) {
      const raw = params[key];
      if (typeof raw === 'string' && raw.trim()) {
        ids.add(raw.trim());
      }
    }
  }

  for (const key of ['path', 'filePath', 'dirPath', 'directory']) {
    const raw = params[key];
    if (typeof raw !== 'string' || !raw.trim()) {
      continue;
    }
    const normalized = raw.replace(/\\/g, '/');
    const match = normalized.match(/(?:^|\/)src\/apps\/([^/]+)\//);
    if (match?.[1]) {
      ids.add(match[1]);
    }
  }

  return [...ids];
}

export interface AppScopedMcpAuthResult {
  allowed: boolean;
  reason?: string;
}

/**
 * **D-03 / IMPLEMENTATION-PLAN 1.19** — app-scoped code-change authorization for MCP tools.
 */
export function evaluateAppScopedMcpToolAccess(
  user: User | null | undefined,
  toolId: string,
  params: Record<string, unknown>,
): AppScopedMcpAuthResult {
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  if (isOwnerOrAdmin) {
    return { allowed: true };
  }
  const targetApps = resolveTargetAppIdsFromToolParams(toolId, params);
  if (targetApps.length === 0) {
    return {
      allowed: false,
      reason: `Could not resolve target app for "${toolId}" — owner/admin or app canUpdate required in production`,
    };
  }
  const denied = targetApps.filter((appId) => !userCanUpdateApp(user, appId));
  if (denied.length === 0) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Missing canUpdate on app(s): ${denied.join(', ')} for tool "${toolId}" in production profile`,
  };
}
