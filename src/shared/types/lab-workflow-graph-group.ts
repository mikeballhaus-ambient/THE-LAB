export type LabWorkflowGraphGroupType = 'actions' | 'rules';

/** How contained action steps run. */
export type LabWorkflowActionGroupExecutionMode = 'sequential' | 'parallel';

/** When a step returns abort / throws. */
export type LabWorkflowActionGroupFailurePolicy = 'stop' | 'continue';

/** How contained library rules are combined. */
export type LabWorkflowRuleGroupCombineMode = 'sequential_first_match' | 'all_match' | 'any_match';

export const LAB_WORKFLOW_ACTION_GROUP_EXECUTION_OPTIONS: {
  label: string;
  value: LabWorkflowActionGroupExecutionMode;
}[] = [
  { label: 'In order (one after another)', value: 'sequential' },
  { label: 'All at once (parallel)', value: 'parallel' },
];

export const LAB_WORKFLOW_ACTION_GROUP_FAILURE_OPTIONS: {
  label: string;
  value: LabWorkflowActionGroupFailurePolicy;
}[] = [
  { label: 'Stop remaining steps on failure', value: 'stop' },
  { label: 'Continue with remaining steps', value: 'continue' },
];

export const LAB_WORKFLOW_RULE_GROUP_COMBINE_OPTIONS: {
  label: string;
  value: LabWorkflowRuleGroupCombineMode;
}[] = [
  { label: 'First matching rule wins', value: 'sequential_first_match' },
  { label: 'All rules must match', value: 'all_match' },
  { label: 'Any rule may match', value: 'any_match' },
];
