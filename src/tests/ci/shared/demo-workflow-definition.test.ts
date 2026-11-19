import { describe, expect, test } from '@jest/globals';
import { buildDemoCrmSalesApprovalWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-crm-approval';
import { buildDemoCrmSalesApprovalResponseWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-crm-approval-response';
import { buildDemoExpenseApprovedLedgerWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-expense-ledger';
import { buildDemoTaskAssigneeWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-task-assignee';
import { buildDemoWorkflowDefinition } from '@/shared/utils/demo-workflow-definition';
import {
  DEMO_APPROVAL_POLICY_ID,
  DEMO_WORKFLOW_SEEDS,
} from '@/shared/utils/demo-workflow-seed-catalog';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { validateWorkflowDefinition } from '@/shared/utils/validate-lab-workflow-definition';
import { LAB_DOMAIN_EVENT_CATALOG } from '@/shared/lab-domain-events/aggregate-domain-event-catalog';
import {
  LabWorkflowDefinitionV2Schema,
  LabWorkflowGraphEdgeSchema,
} from '@/shared/types/schemas/lab-workflow-graph-schema';

describe('demo workflow seeds', () => {
  test('catalog lists host-app demo workflows plus webhook loop', () => {
    expect(DEMO_WORKFLOW_SEEDS).toHaveLength(15);
    const ids = DEMO_WORKFLOW_SEEDS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('a1000002-0002-4002-8002-000000000100');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000116');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000118');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000125');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000127');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000128');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000129');
    expect(ids).toContain('a1000002-0002-4002-8002-000000000070');
  });

  for (const seed of DEMO_WORKFLOW_SEEDS) {
    test(`${seed.name} validates clean`, () => {
      const def = seed.buildDefinition();
      expect(LabWorkflowDefinitionV2Schema.safeParse(def).success).toBe(true);
      const result = validateWorkflowDefinition(def, {
        declaredCatalogEntries: LAB_DOMAIN_EVENT_CATALOG,
      });
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }
});

describe('buildDemoCrmSalesApprovalResponseWorkflowDefinition', () => {
  const def = buildDemoCrmSalesApprovalResponseWorkflowDefinition();

  test('uses wildcard trigger, single CRM update, then IF for notify copy', () => {
    const trigger = def.nodes.find((n) => n.kind === 'trigger');
    expect(trigger?.kind === 'trigger' && trigger.eventType).toBe('platform-approvals.request.*');
    const ifNode = def.nodes.find((n) => n.kind === 'action' && n.step.kind === 'if_condition');
    expect(ifNode?.kind === 'action' && ifNode.step.kind === 'if_condition' && ifNode.step.conditions[0]).toEqual({
      kind: 'payload_equals',
      path: 'requestStatus',
      value: 'approved',
    });
    const rule = def.nodes.find((n) => n.kind === 'rule' && n.name === 'CRM sales record');
    expect(rule?.kind === 'rule' && rule.conditions?.map((c) => (c.kind === 'payload_equals' ? c.path : c.kind))).toEqual([
      'subjectAppId',
      'subjectEntityType',
    ]);
    const update = def.nodes.find(
      (n) => n.kind === 'action' && n.step.kind === 'integration_update',
    );
    expect(def.nodes.filter((n) => n.kind === 'action' && n.step.kind === 'integration_update')).toHaveLength(1);
    expect(def.nodes.filter((n) => n.kind === 'action' && n.step.kind === 'notify_users')).toHaveLength(2);
    const updateEdge = def.edges.find((e) => e.source === update?.id && e.target === ifNode?.id);
    expect(updateEdge?.when).toBe('always');
  });
});

describe('buildDemoExpenseApprovedLedgerWorkflowDefinition', () => {
  const def = buildDemoExpenseApprovedLedgerWorkflowDefinition();

  test('is graph schema v2', () => {
    expect(def.schemaVersion).toBe(2);
    expect(LabWorkflowDefinitionV2Schema.safeParse(def).success).toBe(true);
  });

  test('trigger is platform approval approved with demo expense policy rule', () => {
    const trigger = def.nodes.find((n) => n.kind === 'trigger');
    expect(trigger?.kind === 'trigger' && trigger.eventType).toBe('platform-approvals.request.approved');
    const policyRule = def.nodes.find((n) => n.kind === 'rule' && n.name === 'Demo expense policy');
    expect(policyRule?.kind === 'rule' && policyRule.conditions).toEqual(
      expect.arrayContaining([
        { kind: 'payload_equals', path: 'policyId', value: DEMO_APPROVAL_POLICY_ID },
      ]),
    );
  });

  test('loads expense via lab_query_app then posts ledger on travel match only', () => {
    const query = def.nodes.find(
      (n) => n.kind === 'action' && n.step.kind === 'lab_query_app',
    );
    expect(query).toBeDefined();
    const rule = def.nodes.find((n) => n.kind === 'rule' && n.name === 'Travel spend');
    expect(rule?.kind === 'rule' && rule.name).toBe('Travel spend');
    const ledger = def.nodes.find((n) => n.kind === 'action' && n.step.kind === 'ledger_post_entry');
    expect(ledger).toBeDefined();
    expect(def.edges.some((e) => e.when === 'on_match' && e.target === ledger?.id)).toBe(true);
  });

  test('every node is reachable from the trigger', () => {
    const triggerId = def.nodes.find((node) => node.kind === 'trigger')!.id;
    const outgoing = new Map<string, string[]>();
    for (const edge of def.edges) {
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    }
    const seen = new Set<string>();
    const stack = [triggerId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of outgoing.get(id) ?? []) stack.push(next);
    }
    expect(seen.size).toBe(def.nodes.length);
  });

  test('arrange LR is idempotent', () => {
    const again = { ...def, nodes: autoArrangeLabWorkflowGraph(def, { direction: 'LR' }) };
    expect(again.nodes.map((node) => node.position)).toEqual(def.nodes.map((node) => node.position));
  });
});

describe('buildDemoTaskAssigneeWorkflowDefinition', () => {
  const def = buildDemoTaskAssigneeWorkflowDefinition();

  test('branches on assigneeId from task.created', () => {
    expect(def.nodes.find((n) => n.kind === 'trigger')?.kind === 'trigger' && def.nodes.find((n) => n.kind === 'trigger')!.eventType).toBe(
      'app-lab-tasklist.task.created',
    );
    const ifNode = def.nodes.find((n) => n.kind === 'action' && n.step.kind === 'if_condition');
    expect(ifNode?.kind).toBe('action');
    if (ifNode?.kind !== 'action' || ifNode.step.kind !== 'if_condition') {
      throw new Error('expected if_condition action node');
    }
    expect(ifNode.step.conditions[0]).toMatchObject({
      kind: 'payload_exists',
      path: 'assigneeId',
    });
  });
});

describe('buildDemoWorkflowDefinition alias', () => {
  test('matches CRM sales approval request flagship', () => {
    expect(buildDemoWorkflowDefinition()).toEqual(buildDemoCrmSalesApprovalWorkflowDefinition());
  });
});

// Keep edge schema guard on flagship graph
describe('flagship edge shape', () => {
  test('every edge is well formed', () => {
    const def = buildDemoExpenseApprovedLedgerWorkflowDefinition();
    const ids = new Set(def.nodes.map((node) => node.id));
    for (const edge of def.edges) {
      expect(LabWorkflowGraphEdgeSchema.safeParse(edge).success).toBe(true);
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });
});
