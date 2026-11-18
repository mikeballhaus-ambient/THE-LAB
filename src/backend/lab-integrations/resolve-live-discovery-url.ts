import type { FormsBuilderContract } from '@/shared/types/forms-builder-integration';

export function resolveLiveDiscoveryUrl(contract: FormsBuilderContract, discoveryPath: string): string {
  const base = contract.endpoints.baseUrl.replace(/\/$/, '');
  const normalized = discoveryPath.startsWith('/') ? discoveryPath : `/${discoveryPath}`;
  if (normalized.startsWith('/api/')) {
    return `${base}${normalized}`;
  }
  return `${base}/api${normalized}`;
}
