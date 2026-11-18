import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_EXPENSE_APPROVAL_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000127",
  "name": "Expense Reports: expense approval — request",
  "description": "When an expense is submitted for review, open the seeded expense approval policy for that expense id.",
  "priority": 73,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000140",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "app-expense-reports.expense.submitted"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000141",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "raise_approval",
          "policyId": "a1000003-0003-4003-8003-000000000013",
          "title": "Expense approval",
          "titlePath": "title",
          "description": "Submitted expense requires manager approval before reimbursement.",
          "subjectAppId": "app-expense-reports",
          "subjectEntityType": "expense",
          "subjectEntityIdPath": "expenseId"
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000142",
        "source": "a1000002-0002-4002-8002-000000000140",
        "target": "a1000002-0002-4002-8002-000000000141",
        "when": "always"
      }
    ],
    "viewport": {
      "x": 193.5,
      "y": 48.5,
      "zoom": 2
    }
  },
  "exportedAt": "2026-10-29T21:02:16.337Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
