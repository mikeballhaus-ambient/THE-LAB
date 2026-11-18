import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_APPROVAL_STEP_PENDING_NOTIFY_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000124",
  "name": "Platform: notify assignee on approval step pending",
  "description": "When `platform-approvals.step.pending` fires, notify the new step assignee (`assigneeUserId`).",
  "priority": 329,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000124",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "platform-approvals.step.pending"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000125",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "if_condition",
          "conditions": [
            {
              "kind": "payload_exists",
              "path": "assigneeUserId"
            }
          ]
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000126",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 328
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "assigneeUserId",
          "message": {
            "title": "Approval step assigned",
            "body": "You have a pending approval step."
          }
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000129",
        "source": "a1000002-0002-4002-8002-000000000124",
        "target": "a1000002-0002-4002-8002-000000000125",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000130",
        "source": "a1000002-0002-4002-8002-000000000125",
        "target": "a1000002-0002-4002-8002-000000000126",
        "when": "on_true",
        "outputIndex": 0
      }
    ],
    "viewport": {
      "x": 240.9541547277937,
      "y": -104.58452722063038,
      "zoom": 1.7621776504297995
    }
  },
  "exportedAt": "2026-10-28T21:24:15.686Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
