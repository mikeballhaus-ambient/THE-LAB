import appsService from '../db/Apps/apps-service';
import { LAB_CATALOG_DEFAULT_CONTEXT_AREA } from '@/shared/constants/lab-shell-ui-automation';

const APP_MANAGEMENT_PREFIX = 'app_management_';
const APP_MANAGEMENT_WITHOUT_REGISTRY_ID = new Set([
  'app_management_create_app',
  'app_management_get_apps',
]);

const APP_ID_ALIASES = ['appId', 'app_id', 'app', 'applicationId'] as const;

export interface ToolExecutionContext {
  userId: number;
  sessionId: string;
  /** Active chat persona — injected for UI automation when the model omits it */
  persona?: string;
}

const UI_AUTOMATION_DISCOVER = 'ui_automation_discover_elements';
const UI_AUTOMATION_ACTION = 'ui_automation_element_action';

const DEFAULT_CATALOG_CONTEXT_AREA = LAB_CATALOG_DEFAULT_CONTEXT_AREA;

function normalizeUiAutomationParams(
  toolId: string,
  params: Record<string, unknown>,
  context: ToolExecutionContext,
): Record<string, unknown> {
  if (toolId !== UI_AUTOMATION_DISCOVER && toolId !== UI_AUTOMATION_ACTION) {
    return params;
  }

  const next = { ...params };

  const persona = next.persona;
  if (typeof persona !== 'string' || !persona.trim()) {
    next.persona = context.persona?.trim() || 'Chat';
  }

  if (toolId === UI_AUTOMATION_DISCOVER) {
    const area = next.contextArea;
    if (typeof area !== 'string' || !area.trim()) {
      next.contextArea = DEFAULT_CATALOG_CONTEXT_AREA;
    }
  }

  return next;
}

function coerceNumericUserId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function resolveRegistryAppId(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const byExactId = appsService.getAppById(trimmed);
  if (byExactId) {
    return byExactId.id;
  }

  if (!trimmed.startsWith('app-')) {
    const prefixed = `app-${trimmed}`;
    const byPrefixed = appsService.getAppById(prefixed);
    if (byPrefixed) {
      return byPrefixed.id;
    }
  }

  const byName = appsService.getAppsByName(trimmed);
  if (byName) {
    return byName.id;
  }

  const lower = trimmed.toLowerCase();
  const byCaseInsensitiveName = appsService.getAllApps().find(
    (app) => app.name.toLowerCase() === lower || app.id.toLowerCase() === lower,
  );
  if (byCaseInsensitiveName) {
    return byCaseInsensitiveName.id;
  }

  const slug = lower.replace(/\s+/g, '-');
  const bySlugId = appsService.getAllApps().find(
    (app) => app.id.toLowerCase() === slug || app.id.toLowerCase() === `app-${slug}`,
  );
  return bySlugId?.id;
}

/** Canonical `apps.id` when registry lookup misses (matches TemplateGenerator convention). */
function canonicalizeRegistryAppId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.startsWith('app-') ? trimmed : `app-${trimmed}`;
}

function normalizeAppManagementId(
  toolId: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (!toolId.startsWith(APP_MANAGEMENT_PREFIX) || APP_MANAGEMENT_WITHOUT_REGISTRY_ID.has(toolId)) {
    return params;
  }

  let next = { ...params };
  let registryId =
    typeof next.id === 'string' && next.id.trim() ? next.id.trim() : undefined;

  if (!registryId) {
    for (const key of APP_ID_ALIASES) {
      const candidate = next[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        registryId = candidate.trim();
        break;
      }
    }
  }

  if (registryId) {
    const resolved = resolveRegistryAppId(registryId);
    next = { ...next, id: resolved ?? canonicalizeRegistryAppId(registryId) };
  }

  for (const key of APP_ID_ALIASES) {
    if (key in next) {
      const rest = { ...next };
      delete rest[key];
      next = rest;
    }
  }

  return next;
}

/**
 * Inject trusted session identity and normalize common model parameter mistakes before Zod validation.
 */
export function applyToolExecutionContext(
  context: ToolExecutionContext,
  toolId: string,
  params: Record<string, unknown>,
): Record<string, unknown> {
  let next: Record<string, unknown> = {
    ...params,
    userId: context.userId,
    sessionId: context.sessionId,
  };

  const modelUserId = coerceNumericUserId(params.userId);
  if (modelUserId !== undefined && modelUserId !== context.userId) {
    next.userId = context.userId;
  }

  next = normalizeAppManagementId(toolId, next);
  next = normalizeUiAutomationParams(toolId, next, context);

  return next;
}
