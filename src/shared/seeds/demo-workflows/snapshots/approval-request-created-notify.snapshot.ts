import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_APPROVAL_REQUEST_CREATED_NOTIFY_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000121",
  "name": "Platform: notify assignee on approval created",
  "description": "When `platform-approvals.request.created` fires, notify the first-step assignee (`assigneeUserId`).",
  "priority": 330,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000121",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "platform-approvals.request.created"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000122",
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
        "id": "a1000002-0002-4002-8002-000000000123",
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
            "title": "Approval assigned",
            "body": "{{payload.title}}"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000127",
        "source": "a1000002-0002-4002-8002-000000000121",
        "target": "a1000002-0002-4002-8002-000000000122",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000128",
        "source": "a1000002-0002-4002-8002-000000000122",
        "target": "a1000002-0002-4002-8002-000000000123",
        "when": "on_true",
        "outputIndex": 0
      }
    ],
    "viewport": {
      "x": 240.9541547277937,
      "y": -54.58452722063038,
      "zoom": 1.7621776504297995
    }
  },
  "exportedAt": "2026-10-28T21:24:14.709Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
