import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_EXPENSE_APPROVAL_RESPONSE_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000128",
  "name": "Expense Reports: expense approval — response",
  "description": "When the expense policy completes, copy `requestStatus` to expense `status`, then notify the requester (wording branches on outcome).",
  "priority": 72,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000143",
        "kind": "trigger",
        "position": {
          "x": 158,
          "y": 48
        },
        "eventType": "platform-approvals.request.*"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000144",
        "kind": "rule",
        "position": {
          "x": 151.86341463414635,
          "y": 126.6341463414634
        },
        "name": "Expense Reports expense",
        "conditions": [
          {
            "kind": "payload_equals",
            "path": "subjectAppId",
            "value": "app-expense-reports"
          },
          {
            "kind": "payload_equals",
            "path": "subjectEntityType",
            "value": "expense"
          }
        ]
      },
      {
        "id": "a1000002-0002-4002-8002-000000000145",
        "kind": "action",
        "position": {
          "x": 98.67967479674797,
          "y": 262.54308943089427
        },
        "step": {
          "kind": "integration_update",
          "providerAppId": "app-expense-reports",
          "serviceId": "expense-reports.expenses",
          "recordIdPath": "subjectEntityId",
          "bodyFromPayload": {
            "status": "requestStatus"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000146",
        "kind": "action",
        "position": {
          "x": 128.339837398374,
          "y": 349.359349593496
        },
        "step": {
          "kind": "if_condition",
          "conditions": [
            {
              "kind": "payload_equals",
              "path": "requestStatus",
              "value": "approved"
            }
          ]
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000147",
        "kind": "action",
        "position": {
          "x": -28.707317073170728,
          "y": 471.97235772357726
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your expense was approved",
            "body": "{{payload.title}}"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000148",
        "kind": "action",
        "position": {
          "x": 256.749593495935,
          "y": 471.9723577235774
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your expense was declined",
            "body": "{{payload.title}}"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000149",
        "source": "a1000002-0002-4002-8002-000000000143",
        "target": "a1000002-0002-4002-8002-000000000144",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000150",
        "source": "a1000002-0002-4002-8002-000000000144",
        "target": "a1000002-0002-4002-8002-000000000145",
        "when": "on_match"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000151",
        "source": "a1000002-0002-4002-8002-000000000145",
        "target": "a1000002-0002-4002-8002-000000000146",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000152",
        "source": "a1000002-0002-4002-8002-000000000146",
        "target": "a1000002-0002-4002-8002-000000000147",
        "when": "on_true",
        "outputIndex": 0
      },
      {
        "id": "a1000002-0002-4002-8002-000000000153",
        "source": "a1000002-0002-4002-8002-000000000146",
        "target": "a1000002-0002-4002-8002-000000000148",
        "when": "on_false",
        "outputIndex": 1
      }
    ],
    "viewport": {
      "x": 173.5505676533258,
      "y": -29.881653681995374,
      "zoom": 1.247534451708237
    }
  },
  "exportedAt": "2026-10-29T21:02:17.551Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
