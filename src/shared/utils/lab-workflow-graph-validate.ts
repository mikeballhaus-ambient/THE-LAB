import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';
import { labWorkflowRuleNodeNeedsConfiguration } from '@/shared/utils/lab-workflow-graph-rule-node';

export function validateLabWorkflowGraphForSave(definition: LabWorkflowDefinitionV2): string | null {
  const triggers = definition.nodes.filter((n) => n.kind === 'trigger');
  if (triggers.length !== 1) {
    return 'The workflow must have exactly one event (trigger) node on the canvas.';
  }
  const trigger = triggers[0];
  if (trigger.kind === 'trigger' && !trigger.eventType.trim()) {
    return 'Set an event type on the trigger node.';
  }
  const incompleteRule = definition.nodes.some((node) =>
    labWorkflowRuleNodeNeedsConfiguration(definition, node),
  );
  if (incompleteRule) {
    return 'Add a name and at least one condition for wired rule nodes in the details panel.';
  }
  const emptyCondition = definition.nodes.some(
    (n) => n.kind === 'condition' && (!n.conditions || n.conditions.length === 0),
  );
  if (emptyCondition) {
    return 'Add at least one condition to each condition node, or remove empty condition nodes.';
  }
  // Trigger output mapping (phase 37). Structural only — the validator has no payload, so whether a
  // `from` resolves is checked in the panel against the captured shape. What it *can* check is that
  // the mapping is well formed, and that no two rows fight over one output name.
  for (const node of definition.nodes) {
    if (node.kind !== 'trigger' || !node.mapping?.length) {
      continue;
    }
    const seenTargets = new Set<string>();
    for (const row of node.mapping) {
      const from = row.from?.trim() ?? '';
      const to = row.to?.trim() ?? '';
      if (!from || !to) {
        return 'Each output mapping row needs both a source field and an output name.';
      }
      if (seenTargets.has(to)) {
        return `Two output mapping rows write "${to}". Give each a distinct name.`;
      }
      seenTargets.add(to);
    }
  }

  const hasAction = definition.nodes.some((n) => n.kind === 'action');
  if (!hasAction) {
    return 'Add at least one action node to the workflow.';
  }
  return null;
}
