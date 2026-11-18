import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';

function nodeStructureSlice(node: LabWorkflowGraphNodeV2): Record<string, unknown> {
  const { position, ...rest } = node;
  void position;
  if (rest.kind === 'group') {
    const { width, height, ...groupRest } = rest;
    void width;
    void height;
    return groupRest;
  }
  return rest;
}

/**
 * Fingerprint for graph content excluding node positions.
 * Used to avoid resetting Vue Flow when the parent echoes position-only updates after drag.
 */
export function labWorkflowGraphStructureSyncKey(def: LabWorkflowDefinitionV2): string {
  return JSON.stringify({
    schemaVersion: def.schemaVersion,
    nodes: def.nodes.map((node) => nodeStructureSlice(node)),
    edges: def.edges,
  });
}
