import { describe, expect, test } from '@jest/globals';
import { validateWorkflowDefinition } from '@/shared/utils/validate-lab-workflow-definition';
import { LAB_DOMAIN_EVENT_CATALOG } from '@/shared/lab-domain-events/aggregate-domain-event-catalog';
import { buildDemoWorkflowDefinition } from '@/shared/utils/demo-workflow-definition';
import type { LabWorkflowDefinitionV2, LabWorkflowGraphNodeV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

/**
 * W3 gate — one validator, shared by the editor and the save path.
 *
 * These tests target the failures that are *silent at runtime*: a dangling edge is dropped, a cycle
 * recurses, a duplicate id shadows a node. Each would let a user save a workflow that runs, reports
 * success, and does nothing.
 */

const TRIGGER = 'n-trigger';
const ACTION = 'n-action';

function node(id: string, kind: 'trigger' | 'action'): LabWorkflowGraphNodeV2 {
  if (kind === 'trigger') {
    return { id, kind: 'trigger', position: { x: 0, y: 0 }, eventType: 'app.test.event' };
  }
  return {
    id,
    kind: 'action',
    position: { x: 0, y: 0 },
    step: { kind: 'notify_users', userIds: [1] },
  };
}

function graph(
  nodes: LabWorkflowGraphNodeV2[],
  edges: LabWorkflowDefinitionV2['edges'],
): LabWorkflowDefinitionV2 {
  return { schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION, nodes, edges };
}

describe('duplicate edge ids', () => {
  test('rejects two edges sharing an id', () => {
    // The canvas keys edges by id. Two entries with one id means the details panel lists a branch the
    // canvas cannot select — the user has no way to delete the shadowed one, so saving must refuse
    // rather than persist an edge the UI can never reach.
    const trigger = node(TRIGGER, 'trigger');
    const action = node(ACTION, 'action');
    const result = validateWorkflowDefinition(
      graph([trigger, action], [
        { id: 'e-dup', source: TRIGGER, target: ACTION, when: 'always' },
        { id: 'e-dup', source: TRIGGER, target: ACTION, when: 'always' },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('duplicate_edge_id');
  });

  test('distinct ids on the same route are accepted', () => {
    // Uniqueness is the invariant, not uniqueness-of-route: two legitimately separate links between
    // the same pair (different branch semantics) must still validate.
    const trigger = node(TRIGGER, 'trigger');
    const action = node(ACTION, 'action');
    const result = validateWorkflowDefinition(
      graph([trigger, action], [
        { id: 'e-1', source: TRIGGER, target: ACTION, when: 'always' },
      ]),
    );
    expect(result.errors.map((e) => e.code)).not.toContain('duplicate_edge_id');
  });
});

describe('validateWorkflowDefinition (W3)', () => {
  test('the demo workflow is valid and produces no warnings', () => {
    const result = validateWorkflowDefinition(buildDemoWorkflowDefinition(), {
      declaredCatalogEntries: LAB_DOMAIN_EVENT_CATALOG,
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('a graph with no trigger is rejected', () => {
    const result = validateWorkflowDefinition(graph([node(ACTION, 'action')], []));
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('missing_trigger');
  });

  test('two triggers are rejected — the second would never fire', () => {
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger'), node('n2', 'trigger'), node(ACTION, 'action')], [
        { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.filter((e) => e.code === 'multiple_triggers')).toHaveLength(2);
  });

  test('a dangling edge is an error, because that branch vanishes at run time', () => {
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger')], [
        { id: 'e1', source: TRIGGER, target: 'does-not-exist', when: 'always' },
      ]),
    );
    expect(result.valid).toBe(false);
    const issue = result.errors.find((e) => e.code === 'dangling_edge');
    expect(issue?.message).toContain('does-not-exist');
  });

  test('a self-edge is rejected', () => {
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger')], [
        { id: 'e1', source: TRIGGER, target: TRIGGER, when: 'always' },
      ]),
    );
    expect(result.errors.map((e) => e.code)).toContain('self_edge');
  });

  test('a cycle is rejected before it can recurse at run time', () => {
    const first: LabWorkflowGraphNodeV2 = {
      id: 'c1',
      kind: 'condition',
      position: { x: 0, y: 0 },
      conditions: [],
    };
    const second: LabWorkflowGraphNodeV2 = {
      id: 'c2',
      kind: 'condition',
      position: { x: 0, y: 0 },
      conditions: [],
    };
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger'), first, second], [
        { id: 'e1', source: TRIGGER, target: 'c1', when: 'always' },
        { id: 'e2', source: 'c1', target: 'c2', when: 'on_true' },
        { id: 'e3', source: 'c2', target: 'c1', when: 'on_true' },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('cycle');
  });

  test('duplicate node ids are rejected', () => {
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger'), node(ACTION, 'action'), node(ACTION, 'action')], [
        { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('duplicate_node_id');
  });

  test('an unreachable node is a warning, not an error — the graph still runs', () => {
    const orphan = node('n-orphan', 'action');
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger'), node(ACTION, 'action'), orphan], [
        { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
      ]),
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('unreachable_node');
    expect(result.warnings.find((w) => w.code === 'unreachable_node')?.targetId).toBe('n-orphan');
  });

  test('a rule with no conditions is warned about, because it always matches', () => {
    const emptyRule: LabWorkflowGraphNodeV2 = {
      id: 'r1',
      kind: 'rule',
      position: { x: 0, y: 0 },
      conditions: [],
    };
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger'), emptyRule, node(ACTION, 'action')], [
        { id: 'e1', source: TRIGGER, target: 'r1', when: 'always' },
        { id: 'e2', source: 'r1', target: ACTION, when: 'on_match' },
      ]),
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('empty_rule');
  });

  test('a workflow with no actions is warned about', () => {
    const result = validateWorkflowDefinition(
      graph([node(TRIGGER, 'trigger')], []),
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('no_actions');
  });

  describe('trigger event type (W4.5)', () => {
    test('a documented event type produces no warning', () => {
      const trigger: LabWorkflowGraphNodeV2 = {
        id: TRIGGER,
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: 'app-lab-tasklist.task.created',
      };
      const result = validateWorkflowDefinition(
        graph([trigger, node(ACTION, 'action')], [
          { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
        ]),
        { declaredCatalogEntries: LAB_DOMAIN_EVENT_CATALOG },
      );

      expect(result.warnings.map((w) => w.code)).not.toContain('unknown_trigger_event');
    });

    test('a declared-but-unpublished event type is documented, so it does not warn', () => {
      // The static catalog is a declaration of contract: apps catch up to it later. Warning here
      // would flag the whole forward-looking catalogue, which teaches authors to ignore the panel.
      const trigger: LabWorkflowGraphNodeV2 = {
        id: TRIGGER,
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: 'app-expense-reports.expense.approved',
      };
      const result = validateWorkflowDefinition(
        graph([trigger, node(ACTION, 'action')], [
          { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
        ]),
        { declaredCatalogEntries: LAB_DOMAIN_EVENT_CATALOG },
      );

      expect(result.warnings.map((w) => w.code)).not.toContain('unknown_trigger_event');
    });

    test('an observed but undocumented event type does not warn', () => {
      const trigger: LabWorkflowGraphNodeV2 = {
        id: TRIGGER,
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: 'app-custom.demo.pinged',
      };
      const result = validateWorkflowDefinition(
        graph([trigger, node(ACTION, 'action')], [
          { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
        ]),
        {
          observedEventTypes: [
            {
              eventType: 'app-custom.demo.pinged',
              sourceAppId: 'app-custom',
              lastSeenAt: '2026-01-01T00:00:00.000Z',
              publishCount: 2,
            },
          ],
        },
      );

      expect(result.warnings.map((w) => w.code)).not.toContain('unknown_trigger_event');
    });

    test('a typo warns but does not block — the workflow still saves', () => {
      const trigger: LabWorkflowGraphNodeV2 = {
        id: TRIGGER,
        kind: 'trigger',
        position: { x: 0, y: 0 },
        eventType: 'app-lab-tasklist.task.creatd',
      };
      const result = validateWorkflowDefinition(graph([trigger, node(ACTION, 'action')], [
        { id: 'e1', source: TRIGGER, target: ACTION, when: 'always' },
      ]));

      expect(result.valid).toBe(true);
      const issue = result.warnings.find((w) => w.code === 'unknown_trigger_event');
      expect(issue?.targetId).toBe(TRIGGER);
      expect(issue?.message).toContain('app-lab-tasklist.task.creatd');
    });
  });
});
