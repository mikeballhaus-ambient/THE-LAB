import type { LabWorkflowDefinitionV1, LabWorkflowStepV1 } from '@/shared/types/lab-workflow';

function newId(): string {
  return crypto.randomUUID();
}
import type {
  LabWorkflowDefinitionV2,
  LabWorkflowGraphEdgeV2,
  LabWorkflowGraphNodeV2,
} from '@/shared/types/lab-workflow-graph';
import { LAB_WORKFLOW_GRAPH_SCHEMA_VERSION } from '@/shared/types/lab-workflow-graph';
import type { LabWorkflowDefinition } from '@/shared/types/lab-workflow';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';

function stepToNode(step: LabWorkflowStepV1, index: number): LabWorkflowGraphNodeV2 {
  const y = 200 + index * 130;
  if (step.kind === 'rule_ref') {
    return {
      id: newId(),
      kind: 'rule',
      position: { x: 160, y },
      ruleId: step.ruleId,
    };
  }
  return {
    id: newId(),
    kind: 'action',
    position: { x: 160, y },
    step,
  };
}

/** Convert legacy linear v1 definitions to a graph for the visual editor / v2 runtime. */
export function linearWorkflowToGraph(definition: LabWorkflowDefinitionV1): LabWorkflowDefinitionV2 {
  const triggerId = newId();
  const nodes: LabWorkflowGraphNodeV2[] = [
    {
      id: triggerId,
      kind: 'trigger',
      position: { x: 160, y: 40 },
      eventType: definition.trigger.eventType,
    },
  ];
  const edges: LabWorkflowGraphEdgeV2[] = [];

  let previousId = triggerId;

  if (definition.conditions?.length) {
    const conditionId = newId();
    nodes.push({
      id: conditionId,
      kind: 'condition',
      position: { x: 160, y: 120 },
      conditions: definition.conditions,
    });
    edges.push({
      id: newId(),
      source: previousId,
      target: conditionId,
      when: 'always',
    });
    previousId = conditionId;
  }

  const stepNodes = definition.steps.map((step, index) => stepToNode(step, index));
  for (const node of stepNodes) {
    nodes.push(node);
    edges.push({
      id: newId(),
      source: previousId,
      target: node.id,
      when: previousId === triggerId || nodes.find((n) => n.id === previousId)?.kind === 'condition'
        ? definition.conditions?.length
          ? 'on_true'
          : 'always'
        : 'always',
    });
    previousId = node.id;
  }

  return {
    schemaVersion: LAB_WORKFLOW_GRAPH_SCHEMA_VERSION,
    nodes,
    edges,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function ensureWorkflowGraphDefinition(definition: LabWorkflowDefinition): LabWorkflowDefinitionV2 {
  if (isLabWorkflowDefinitionV2(definition)) {
    return definition;
  }
  return linearWorkflowToGraph(definition);
}
