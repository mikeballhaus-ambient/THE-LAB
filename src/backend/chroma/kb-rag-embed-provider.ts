import { createProviderAdapter } from '@/backend/ai/provider-adapter-factory';
import { aiProviderService } from '@/backend/db/AIProvider/ai-provider-service';
import type { LLMProvider } from '@/shared/types';

/**
 * Resolve embed adapter for KB RAG (ingest, slot A, hybrid search).
 * Unlike {@link ProviderService.ResolveProviderAdapter}, does not require chat config.
 */
export function resolveUserEmbedProviderAdapter(userId: number): LLMProvider | undefined {
  const embedConfig = aiProviderService.getUserProviderConfigById(userId, 'embed');
  if (!embedConfig) {
    return undefined;
  }
  const adapter = createProviderAdapter(embedConfig);
  if (!adapter?.embed) {
    return undefined;
  }
  return adapter;
}