import { describe, expect, test } from '@jest/globals';
import { buildDemoExpenseApprovedLedgerWorkflowDefinition } from '@/shared/utils/demo-workflow-definition-expense-ledger';
import { labWorkflowGraphNodeConditionLines } from '@/shared/utils/lab-workflow-graph-labels';

describe('labWorkflowGraphNodeConditionLines', () => {
  test('demo expense lookup and rule nodes expose readable first lines', () => {
    const def = buildDemoExpenseApprovedLedgerWorkflowDefinition();
    const lookup = def.nodes.find((node) => node.kind === 'condition');
    expect(lookup).toBeDefined();
    const lookupLines = labWorkflowGraphNodeConditionLines(lookup!);
    expect(lookupLines[0]).toMatch(/status/i);

    const rule = def.nodes.find(
      (node) => node.kind === 'rule' && node.name === 'Travel spend',
    );
    expect(rule).toBeDefined();
    const ruleLines = labWorkflowGraphNodeConditionLines(rule!);
    expect(ruleLines[0]).toMatch(/category/i);
  });
});
