import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';

function baseDef(
  nodes: LabWorkflowDefinitionV2['nodes'],
  edges: LabWorkflowDefinitionV2['edges'],
): LabWorkflowDefinitionV2 {
  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes,
    edges,
  };
}

describe('autoArrangeLabWorkflowGraph', () => {
  function chainDef(): LabWorkflowDefinitionV2 {
    const triggerId = 't1';
    const conditionId = 'c1';
    const actionId = 'a1';
    return baseDef(
      [
        {
          id: triggerId,
          kind: 'trigger',
          position: { x: 0, y: 0 },
          eventType: 'app-lab-tasklist.task.created',
        },
        {
          id: conditionId,
          kind: 'condition',
          position: { x: 0, y: 200 },
          conditions: [],
        },
        {
          id: actionId,
          kind: 'action',
          position: { x: 400, y: 0 },
          step: { kind: 'notify_users', userIds: [], path: 'userId' },
        },
      ],
      [
        { id: 'e1', source: triggerId, target: conditionId, when: 'always' },
        { id: 'e2', source: conditionId, target: actionId, when: 'on_true' },
      ],
    );
  }

  test('defaults to top-to-bottom (vertical) layering', () => {
    const arranged = autoArrangeLabWorkflowGraph(chainDef());
    const trigger = arranged.find((n) => n.id === 't1')!;
    const condition = arranged.find((n) => n.id === 'c1')!;
    const action = arranged.find((n) => n.id === 'a1')!;

    // Layers advance downwards, siblings advance across.
    expect(trigger.position.y).toBeLessThan(condition.position.y);
    expect(condition.position.y).toBeLessThan(action.position.y);
  });

  test('honours an explicit left-to-right request', () => {
    const arranged = autoArrangeLabWorkflowGraph(chainDef(), { direction: 'LR' });
    const trigger = arranged.find((n) => n.id === 't1')!;
    const condition = arranged.find((n) => n.id === 'c1')!;
    const action = arranged.find((n) => n.id === 'a1')!;

    expect(trigger.position.x).toBeLessThan(condition.position.x);
    expect(condition.position.x).toBeLessThan(action.position.x);
  });

  test('does not inflate vertical gaps when a layer has multiple horizontal siblings', () => {
    const triggerId = 't1';
    const branchA = 'a1';
    const branchB = 'a2';
    const branchC = 'a3';
    const tail = 'tail';
    const def = baseDef(
      [
        {
          id: triggerId,
          kind: 'trigger',
          position: { x: 0, y: 0 },
          eventType: 'app-lab-tasklist.task.created',
        },
        {
          id: branchA,
          kind: 'action',
          position: { x: 0, y: 0 },
          step: { kind: 'notify_users', userIds: [], path: 'userId' },
        },
        {
          id: branchB,
          kind: 'action',
          position: { x: 0, y: 0 },
          step: { kind: 'notify_users', userIds: [], path: 'userId' },
        },
        {
          id: branchC,
          kind: 'action',
          position: { x: 0, y: 0 },
          step: { kind: 'notify_users', userIds: [], path: 'userId' },
        },
        {
          id: tail,
          kind: 'action',
          position: { x: 0, y: 0 },
          step: { kind: 'notify_users', userIds: [], path: 'userId' },
        },
      ],
      [
        { id: 'e1', source: triggerId, target: branchA, when: 'always' },
        { id: 'e2', source: triggerId, target: branchB, when: 'always' },
        { id: 'e3', source: triggerId, target: branchC, when: 'always' },
        { id: 'e4', source: branchA, target: tail, when: 'always' },
        { id: 'e5', source: branchB, target: tail, when: 'always' },
        { id: 'e6', source: branchC, target: tail, when: 'always' },
      ],
    );

    const arranged = autoArrangeLabWorkflowGraph(def);
    const trigger = arranged.find((n) => n.id === triggerId)!;
    const tailNode = arranged.find((n) => n.id === tail)!;
    const layerStep = tailNode.position.y - trigger.position.y;

    // Two layer strides (trigger → branches → tail), not the old bug that added a full sibling stack per layer.
    expect(layerStep).toBeLessThan(320);
    expect(layerStep).toBeGreaterThan(200);
  });

  test('stacks children inside a group and expands group bounds', () => {
    const groupId = 'g1';
    const ruleId = 'r1';
    const actionId = 'a1';
    const def = baseDef(
      [
        {
          id: groupId,
          kind: 'group',
          position: { x: 10, y: 10 },
          label: 'Rules',
          groupType: 'rules',
          width: 120,
          height: 120,
        },
        {
          id: ruleId,
          kind: 'rule',
          groupId,
          position: { x: 0, y: 0 },
          ruleId: 'lib-1',
        },
        {
          id: actionId,
          kind: 'action',
          groupId,
          position: { x: 0, y: 90 },
          step: { kind: 'notify_users', userIds: [], path: 'userId' },
        },
      ],
      [],
    );

    const arranged = autoArrangeLabWorkflowGraph(def);
    const group = arranged.find((n) => n.id === groupId && n.kind === 'group');
    const rule = arranged.find((n) => n.id === ruleId)!;
    const action = arranged.find((n) => n.id === actionId)!;

    expect(rule.position.y).toBeLessThan(action.position.y);
    expect(group?.kind === 'group' && (group.width ?? 0)).toBeGreaterThan(200);
    expect(group?.kind === 'group' && (group.height ?? 0)).toBeGreaterThan(160);
  });
});
