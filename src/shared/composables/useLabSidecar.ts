import type { ComputedRef } from 'vue';
import type { LabSidecarViewContext } from '@/shared/types/lab-sidecar-view-context';
import { useLabWorkspaceContext } from '@/shared/composables/useLabWorkspaceContext';

export interface LabSidecarApi {
  /** Merge host hints into the next Sidecar message context (entity ids, routes, etc.). */
  setContext: (patch: Record<string, string>) => void;
  clearContext: () => void;
  viewContext: ComputedRef<LabSidecarViewContext> | null;
}

const noopApi: LabSidecarApi = {
  setContext: () => undefined,
  clearContext: () => undefined,
  viewContext: null,
};

/**
 * Mounted apps call this from composables to enrich Lab Sidecar system prompts (rm-57).
 * Requires workspace context provided by the lab shell (and re-provided in AppLifecycle).
 */
export function useLabSidecar(): LabSidecarApi {
  const workspace = useLabWorkspaceContext();
  if (!workspace) {
    return noopApi;
  }
  return {
    setContext: (patch) => workspace.setHostContext(patch),
    clearContext: () => workspace.clearHostContext(),
    viewContext: workspace.viewContext,
  };
}
