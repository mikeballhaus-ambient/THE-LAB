import { describe, expect, test } from '@jest/globals';
import {
  LAB_WORKFLOW_EXPORT_FORMAT,
  LAB_WORKFLOW_EXPORT_VERSION,
  buildWorkflowExportDocument,
  parseWorkflowExportDocument,
  workflowExportFilename,
} from '@/shared/utils/lab-workflow-portability';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

/**
 * W11 — export and import.
 *
 * The property that matters is that a round trip **preserves the graph's shape while replacing every
 * identifier**. Preserving ids would let a crafted file collide with an existing workflow; replacing
 * ids independently per node and edge would leave every edge dangling.
 */

const NODE = {
  trigger: '90000001-0000-4000-8000-000000000001',
  write: '90000001-0000-4000-8000-000000000002',
  notify: '90000001-0000-4000-8000-000000000003',
};
const EDGE = {
  a: '90000002-0000-4000-8000-000000000001',
  b: '90000002-0000-4000-8000-000000000002',
};

function definition(): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes: [
      { id: NODE.trigger, kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'task.created' },
      {
        id: NODE.write,
        kind: 'action',
        position: { x: 0, y: 100 },
        step: { kind: 'set_fields', fields: [{ path: 'a', source: 'literal', value: 1 }] },
      },
      {
        id: NODE.notify,
        kind: 'action',
        position: { x: 0, y: 200 },
        step: { kind: 'notify_users', userIds: [2] },
      },
    ],
    edges: [
      { id: EDGE.a, source: NODE.trigger, target: NODE.write, when: 'always' },
      { id: EDGE.b, source: NODE.write, target: NODE.notify, when: 'always' },
    ],
  };
}

describe('export document', () => {
  test('carries the format marker and version', () => {
    const doc = buildWorkflowExportDocument({
      name: 'My workflow',
      definition: definition(),
      exportedAt: '2026-10-19T12:00:00.000Z',
    });
    expect(doc.format).toBe(LAB_WORKFLOW_EXPORT_FORMAT);
    expect(doc.exportVersion).toBe(LAB_WORKFLOW_EXPORT_VERSION);
    expect(doc.exportedAt).toBe('2026-10-19T12:00:00.000Z');
  });

  test('omits an absent description rather than writing null', () => {
    const doc = buildWorkflowExportDocument({ name: 'x', description: null, definition: definition() });
    expect(doc).not.toHaveProperty('description');
  });

  test('survives JSON serialisation unchanged', () => {
    const doc = buildWorkflowExportDocument({ name: 'x', definition: definition() });
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe('import', () => {
  test('round-trips the graph shape', () => {
    const doc = buildWorkflowExportDocument({ name: 'My workflow', definition: definition() });
    const result = parseWorkflowExportDocument(JSON.parse(JSON.stringify(doc)));

    expect(result.ok).toBe(true);
    const nodes = result.document?.definition.nodes ?? [];
    expect(nodes).toHaveLength(3);
    expect(nodes.map((node) => node.kind)).toEqual(['trigger', 'action', 'action']);
    expect(result.document?.definition.edges).toHaveLength(2);
  });

  test('replaces every node and edge id', () => {
    const doc = buildWorkflowExportDocument({ name: 'x', definition: definition() });
    const result = parseWorkflowExportDocument(doc);
    const imported = result.document?.definition;

    const nodeIds = (imported?.nodes ?? []).map((node) => node.id);
    expect(nodeIds).not.toContain(NODE.trigger);
    expect(nodeIds).not.toContain(NODE.write);
    expect(nodeIds.every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);

    const edgeIds = (imported?.edges ?? []).map((edge) => edge.id);
    expect(edgeIds).not.toContain(EDGE.a);
    expect(edgeIds).not.toContain(EDGE.b);
  });

  test('rewires edges to the new node ids, so no edge dangles', () => {
    // The bug this catches: minting node and edge ids from separate maps leaves every edge pointing
    // at an id that no longer exists. The graph parses and runs nothing.
    const doc = buildWorkflowExportDocument({ name: 'x', definition: definition() });
    const imported = parseWorkflowExportDocument(doc).document?.definition;
    const nodeIds = new Set((imported?.nodes ?? []).map((node) => node.id));

    for (const edge of imported?.edges ?? []) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });

  test('importing the same document twice yields different ids', () => {
    const doc = buildWorkflowExportDocument({ name: 'x', definition: definition() });
    const first = parseWorkflowExportDocument(doc).document?.definition.nodes[0]?.id;
    const second = parseWorkflowExportDocument(doc).document?.definition.nodes[0]?.id;
    // Two imports must not collide; that is what makes the file safe to share.
    expect(first).not.toBe(second);
  });

  test('preserves step configuration verbatim', () => {
    const doc = buildWorkflowExportDocument({ name: 'x', definition: definition() });
    const imported = parseWorkflowExportDocument(doc).document?.definition;
    const write = imported?.nodes.find((node) => node.kind === 'action');
    expect(write).toMatchObject({
      step: { kind: 'set_fields', fields: [{ path: 'a', source: 'literal', value: 1 }] },
      position: { x: 0, y: 100 },
    });
  });

  test.each([
    ['a string', 'not a document', 'not_an_object'],
    ['an array', [1, 2], 'not_an_object'],
    ['null', null, 'not_an_object'],
    ['a foreign format', { format: 'other.thing', exportVersion: 1 }, 'wrong_format'],
    [
      'a future version',
      { format: LAB_WORKFLOW_EXPORT_FORMAT, exportVersion: 99, definition: definition() },
      'unsupported_version',
    ],
    [
      'a document with no definition',
      { format: LAB_WORKFLOW_EXPORT_FORMAT, exportVersion: LAB_WORKFLOW_EXPORT_VERSION },
      'missing_definition',
    ],
    [
      'a definition of the wrong schema version',
      {
        format: LAB_WORKFLOW_EXPORT_FORMAT,
        exportVersion: LAB_WORKFLOW_EXPORT_VERSION,
        definition: { schemaVersion: 1, nodes: [], edges: [] },
      },
      'invalid_definition',
    ],
    [
      'a definition with no nodes array',
      {
        format: LAB_WORKFLOW_EXPORT_FORMAT,
        exportVersion: LAB_WORKFLOW_EXPORT_VERSION,
        definition: { schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION, edges: [] },
      },
      'invalid_definition',
    ],
  ])('rejects %s', (_name, input, failure) => {
    const result = parseWorkflowExportDocument(input);
    expect(result.ok).toBe(false);
    expect(result.failure).toBe(failure);
  });

  test('an absent name falls back rather than producing an empty title', () => {
    const doc = {
      format: LAB_WORKFLOW_EXPORT_FORMAT,
      exportVersion: LAB_WORKFLOW_EXPORT_VERSION,
      definition: definition(),
    };
    expect(parseWorkflowExportDocument(doc).document?.name).toBe('Imported workflow');
  });

  test('an absent timestamp is filled in', () => {
    const doc = {
      format: LAB_WORKFLOW_EXPORT_FORMAT,
      exportVersion: LAB_WORKFLOW_EXPORT_VERSION,
      name: 'x',
      definition: definition(),
    };
    expect(parseWorkflowExportDocument(doc).document?.exportedAt).toBeTruthy();
  });
});

describe('filename', () => {
  test.each([
    ['My Workflow', 'my-workflow.workflow.json'],
    ['  Trimmed  ', 'trimmed.workflow.json'],
    ['Weird/Chars:Here!', 'weird-chars-here.workflow.json'],
    ['', 'workflow.workflow.json'],
    ['---', 'workflow.workflow.json'],
  ])('slugifies %s', (name, expected) => {
    expect(workflowExportFilename(name)).toBe(expected);
  });

  test('caps the length so the extension survives on every filesystem', () => {
    const name = 'a'.repeat(200);
    expect(workflowExportFilename(name).length).toBeLessThanOrEqual(80);
  });
});
