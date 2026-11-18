import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_RESPONSE_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000119",
  "name": "CRM: quote approval — response",
  "description": "When the CRM quote policy completes, copy `requestStatus` to `approvalStatus`, then notify the requester (wording branches on outcome).",
  "priority": 308,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000104",
        "kind": "trigger",
        "position": {
          "x": 158,
          "y": 48
        },
        "eventType": "platform-approvals.request.*"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000105",
        "kind": "rule",
        "position": {
          "x": 174.36422764227643,
          "y": 129.70243902439023
        },
        "name": "CRM quote record",
        "conditions": [
          {
            "kind": "payload_equals",
            "path": "subjectAppId",
            "value": "app-lab-crm"
          },
          {
            "kind": "payload_equals",
            "path": "subjectEntityType",
            "value": "quotes"
          }
        ]
      },
      {
        "id": "a1000002-0002-4002-8002-000000000106",
        "kind": "action",
        "position": {
          "x": 108.90731707317073,
          "y": 262.5430894308943
        },
        "step": {
          "kind": "integration_update",
          "providerAppId": "app-lab-crm",
          "serviceId": "crm.quotes",
          "recordIdPath": "subjectEntityId",
          "bodyFromPayload": {
            "approvalStatus": "requestStatus"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-00000000010c",
        "kind": "action",
        "position": {
          "x": 139.59024390243903,
          "y": 354.47317073170734
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
        "id": "a1000002-0002-4002-8002-000000000107",
        "kind": "action",
        "position": {
          "x": -18.47967479674797,
          "y": 480.15447154471553
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your quote approval was approved",
            "body": "{{payload.title}}"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-00000000010e",
        "kind": "action",
        "position": {
          "x": 250.61300813008125,
          "y": 480.15447154471553
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your quote approval was declined",
            "body": "{{payload.title}}"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000108",
        "source": "a1000002-0002-4002-8002-000000000104",
        "target": "a1000002-0002-4002-8002-000000000105",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000109",
        "source": "a1000002-0002-4002-8002-000000000105",
        "target": "a1000002-0002-4002-8002-000000000106",
        "when": "on_match"
      },
      {
        "id": "a1000002-0002-4002-8002-00000000010a",
        "source": "a1000002-0002-4002-8002-000000000106",
        "target": "a1000002-0002-4002-8002-00000000010c",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-00000000010f",
        "source": "a1000002-0002-4002-8002-00000000010c",
        "target": "a1000002-0002-4002-8002-000000000107",
        "when": "on_true",
        "outputIndex": 0
      },
      {
        "id": "a1000002-0002-4002-8002-000000000110",
        "source": "a1000002-0002-4002-8002-00000000010c",
        "target": "a1000002-0002-4002-8002-00000000010e",
        "when": "on_false",
        "outputIndex": 1
      }
    ],
    "viewport": {
      "x": 265.18759936406997,
      "y": -15.931637519872822,
      "zoom": 0.9777424483306836
    }
  },
  "exportedAt": "2026-10-28T18:02:02.428Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
