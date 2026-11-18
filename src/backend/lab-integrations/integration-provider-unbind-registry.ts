import type {
  LabIntegrationProviderUnbindContext,
  LabIntegrationProviderUnbindHandler,
  LabIntegrationProviderUnbindOutcome,
} from '@/shared/lab-integrations/integration-provider-unbind';
import type { LabIntegrationKind } from '@/shared/types/lab-integrations';
import { appIdsMatch } from '@/shared/lab-integrations/normalize-app-id';
import { formsBuilderUnbindProvider } from './providers/forms-builder-unbind-provider';
import { chartBuilderUnbindProvider } from './providers/chart-builder-unbind-provider';

const DEFAULT_HANDLERS: LabIntegrationProviderUnbindHandler[] = [
  formsBuilderUnbindProvider,
  chartBuilderUnbindProvider,
];

const extraHandlers: LabIntegrationProviderUnbindHandler[] = [];

/** Tests or future providers can register additional handlers (last registration wins per app+kind). */
export function registerLabIntegrationProviderUnbindHandler(
  handler: LabIntegrationProviderUnbindHandler,
): void {
  extraHandlers.push(handler);
}

function allHandlers(): LabIntegrationProviderUnbindHandler[] {
  return [...DEFAULT_HANDLERS, ...extraHandlers];
}

export function resolveLabIntegrationProviderUnbindHandler(
  providerAppId: string,
  kind: LabIntegrationKind,
): LabIntegrationProviderUnbindHandler | null {
  for (const handler of allHandlers()) {
    if (!appIdsMatch(providerAppId, handler.registryAppId)) {
      continue;
    }
    if (!handler.kinds.includes(kind)) {
      continue;
    }
    return handler;
  }
  return null;
}

export async function runLabIntegrationProviderUnbindCleanup(
  context: LabIntegrationProviderUnbindContext,
): Promise<LabIntegrationProviderUnbindOutcome> {
  const handler = resolveLabIntegrationProviderUnbindHandler(context.providerAppId, context.kind);
  if (!handler) {
    return {
      assetDeleted: false,
      connectorDeleted: false,
      skipped: true,
      skipReason: 'no_provider_unbind_handler',
    };
  }
  return handler.cleanupAfterUnbind(context);
}
