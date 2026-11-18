import type { LLMProvider } from '@/shared/types';
import { resolveProviderCapabilitiesFromAdapter } from './lab-provider-capabilities';

/** rm-46 Phase 2.11b — honor UI streaming toggle only when the active adapter supports it. */
export function resolveEffectiveStreaming(
  requested: boolean,
  chatProvider: LLMProvider | null | undefined,
): boolean {
  if (!requested || !chatProvider) {
    return false;
  }
  return resolveProviderCapabilitiesFromAdapter(chatProvider).supportsStreaming;
}
