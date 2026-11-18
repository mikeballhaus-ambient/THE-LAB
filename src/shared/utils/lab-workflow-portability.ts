/**
 * Workflow export and import (W11).
 *
 * An export is a **document a user owns**: they paste it into a ticket, commit it, or hand it to a
 * colleague. That has three consequences for the format:
 *
 * 1. it carries a format marker and a version, so a future change can refuse an old file explicitly
 *    rather than half-reading it;
 * 2. it carries **no identifiers that only make sense on one instance** — not the workflow id, not the
 *    node ids. Importing assigns new ids, so the same file can be imported twice without colliding;
 * 3. it carries a short human header, because the first question anyone asks of an exported JSON file
 *    is "what is this?".
 *
 * Node ids are re-minted rather than preserved. The alternative — trusting an imported id — means a
 * crafted file can overwrite another workflow's node references, and node ids have no meaning outside
 * their own graph anyway.
 */

import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

export const LAB_WORKFLOW_EXPORT_FORMAT = 'the-lab.workflow';
export const LAB_WORKFLOW_EXPORT_VERSION = 1;

export interface LabWorkflowExportDocument {
  format: typeof LAB_WORKFLOW_EXPORT_FORMAT;
  exportVersion: typeof LAB_WORKFLOW_EXPORT_VERSION;
  /** Free-form, for a human reading the file. Not used on import. */
  exportedAt: string;
  name: string;
  description?: string;
  definition: LabWorkflowDefinitionV2;
}

export function buildWorkflowExportDocument(params: {
  name: string;
  description?: string | null;
  definition: LabWorkflowDefinitionV2;
  exportedAt?: string;
}): LabWorkflowExportDocument {
  return {
    format: LAB_WORKFLOW_EXPORT_FORMAT,
    exportVersion: LAB_WORKFLOW_EXPORT_VERSION,
    exportedAt: params.exportedAt ?? new Date().toISOString(),
    name: params.name,
    ...(params.description ? { description: params.description } : {}),
    definition: params.definition,
  };
}

export type WorkflowImportFailure =
  | 'not_an_object'
  | 'wrong_format'
  | 'unsupported_version'
  | 'missing_definition'
  | 'invalid_definition';

export interface WorkflowImportResult {
  ok: boolean;
  failure?: WorkflowImportFailure;
  /** Present when `ok`. Ids are freshly minted. */
  document?: LabWorkflowExportDocument;
}

/**
 * Re-mint every node and edge id, preserving the graph's shape.
 *
 * A single map is used for both nodes and edges so an edge always points at the *new* id of its
 * source and target. Re-minting them independently is the classic bug here: the graph parses, and
 * every edge dangles.
 */
function remintGraph(definition: LabWorkflowDefinitionV2): LabWorkflowDefinitionV2 {
  const idMap = new Map<string, string>();
  for (const node of definition.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }
  return {
    ...definition,
    nodes: definition.nodes.map((node) => ({
      ...node,
      id: idMap.get(node.id) ?? crypto.randomUUID(),
    })) as LabWorkflowGraphNodeV2[],
    edges: definition.edges.map((edge) => ({
      ...edge,
      id: crypto.randomUUID(),
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    })) as LabWorkflowGraphEdgeV2[],
  };
}

/**
 * Parse an exported document.
 *
 * Structure only. Whether the graph is *valid* is `validateWorkflowDefinition`'s job (gate G3), and the
 * caller must run it before saving: this function cannot know which event types exist on this instance,
 * so it must not pretend to.
 */
export function parseWorkflowExportDocument(raw: unknown): WorkflowImportResult {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, failure: 'not_an_object' };
  }
  const doc = raw as Partial<LabWorkflowExportDocument>;
  if (doc.format !== LAB_WORKFLOW_EXPORT_FORMAT) {
    return { ok: false, failure: 'wrong_format' };
  }
  if (doc.exportVersion !== LAB_WORKFLOW_EXPORT_VERSION) {
    // Explicit refusal: half-reading a future format is how an import loses half a graph while
    // reporting success.
    return { ok: false, failure: 'unsupported_version' };
  }
  if (!doc.definition || typeof doc.definition !== 'object') {
    return { ok: false, failure: 'missing_definition' };
  }
  const definition = doc.definition as LabWorkflowDefinitionV2;
  if (
    definition.schemaVersion !== LAB_WORKFLOW_GRAPH_SCHEMA_VERSION
    || !Array.isArray(definition.nodes)
    || !Array.isArray(definition.edges)
  ) {
    return { ok: false, failure: 'invalid_definition' };
  }

  return {
    ok: true,
    document: {
      format: LAB_WORKFLOW_EXPORT_FORMAT,
      exportVersion: LAB_WORKFLOW_EXPORT_VERSION,
      exportedAt: typeof doc.exportedAt === 'string' ? doc.exportedAt : new Date().toISOString(),
      name: typeof doc.name === 'string' && doc.name.trim() ? doc.name : 'Imported workflow',
      ...(typeof doc.description === 'string' ? { description: doc.description } : {}),
      definition: remintGraph(definition),
    },
  };
}

/** A filename a user can recognise, with characters no filesystem rejects. */
export function workflowExportFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'workflow'}.workflow.json`;
}
