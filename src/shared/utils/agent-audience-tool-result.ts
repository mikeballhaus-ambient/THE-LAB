import type { IApp } from '@/shared/types/app/app.d';

const APP_READ_TOOLS = new Set(['app_management_get_app', 'app_management_get_apps']);

function redactAppForEndUser(app: IApp): Record<string, unknown> {
  const desc = (app.description ?? '').trim();
  return {
    id: app.id,
    name: app.name,
    description: desc,
    type: app.type,
    faIcon: app.faIcon,
    isEnabled: app.isEnabled,
    version: app.version,
    metadataTags: app.metadataTags ?? app.metadata?.tags,
  };
}

function sanitizeAppManagementPayload(toolId: string, parsed: unknown, isDeveloperMode: boolean): unknown {
  if (isDeveloperMode) {
    return parsed;
  }
  if (toolId === 'app_management_get_app' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return redactAppForEndUser(parsed as IApp);
  }
  if (toolId === 'app_management_get_apps' && Array.isArray(parsed)) {
    return parsed.map((item) =>
      item && typeof item === 'object' ? redactAppForEndUser(item as IApp) : item,
    );
  }
  return parsed;
}

/**
 * Trim tool payloads the model uses to draft user-visible chat (non-developer mode).
 * UI/formatters may still use full tool results from the socket event.
 */
export function sanitizeToolResultContentForAgent(
  toolId: string,
  content: string,
  isDeveloperMode: boolean,
): string {
  if (isDeveloperMode || !content.trim() || !APP_READ_TOOLS.has(toolId)) {
    return content;
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    const sanitized = sanitizeAppManagementPayload(toolId, parsed, isDeveloperMode);
    return JSON.stringify(sanitized, null, 2);
  } catch {
    return content;
  }
}
