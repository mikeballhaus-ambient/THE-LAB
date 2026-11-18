import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_CRM_SALES_LEDGER_POST_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000116",
  "name": "CRM: post ledger on sales deal",
  "description": "When Post entry is requested on a CRM sales record, post a balanced demo journal entry from event `amountCents` and `ledgerMemo`.",
  "priority": 302,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000110",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "app-lab-crm.sales.ledger_post_requested"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000111",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "ledger_post_entry",
          "memo": "CRM sales deal — workflow demo post",
          "memoPath": "ledgerMemo",
          "confirmedByUserId": 1,
          "lines": [
            {
              "accountId": "a1000004-0004-4004-8004-000000000004",
              "side": "debit",
              "amountCentsPath": "amountCents"
            },
            {
              "accountId": "a1000005-0005-4005-8005-000000000005",
              "side": "credit",
              "amountCentsPath": "amountCents"
            }
          ]
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000112",
        "source": "a1000002-0002-4002-8002-000000000110",
        "target": "a1000002-0002-4002-8002-000000000111",
        "when": "always"
      }
    ],
    "viewport": {
      "x": 201,
      "y": 32.5,
      "zoom": 2
    }
  },
  "exportedAt": "2026-10-28T18:02:02.448Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
