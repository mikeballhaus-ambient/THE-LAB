import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_CRM_SALES_APPROVAL_RESPONSE_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000102",
  "name": "CRM: sales approval — response",
  "description": "When the CRM sales deal policy completes, copy `requestStatus` to `approvalStatus`, then notify the requester (wording branches on outcome).",
  "priority": 312,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000087",
        "kind": "trigger",
        "position": {
          "x": 158,
          "y": 48
        },
        "eventType": "platform-approvals.request.*"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000088",
        "kind": "rule",
        "position": {
          "x": 172.31869918699186,
          "y": 135.83902439024388
        },
        "name": "CRM sales record",
        "conditions": [
          {
            "kind": "payload_equals",
            "path": "subjectAppId",
            "value": "app-lab-crm"
          },
          {
            "kind": "payload_equals",
            "path": "subjectEntityType",
            "value": "sales"
          }
        ]
      },
      {
        "id": "a1000002-0002-4002-8002-000000000089",
        "kind": "action",
        "position": {
          "x": 107.88455284552845,
          "y": 278.9073170731707
        },
        "step": {
          "kind": "integration_update",
          "providerAppId": "app-lab-crm",
          "serviceId": "crm.sales",
          "recordIdPath": "subjectEntityId",
          "bodyFromPayload": {
            "approvalStatus": "requestStatus"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-00000000008b",
        "kind": "action",
        "position": {
          "x": 137.5447154471545,
          "y": 369.8146341463414
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
        "id": "a1000002-0002-4002-8002-00000000008a",
        "kind": "action",
        "position": {
          "x": -26.661788617886202,
          "y": 497.5414634146342
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your sales approval was approved",
            "body": "{{payload.title}}"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000096",
        "kind": "action",
        "position": {
          "x": 245.49918699186992,
          "y": 495.4959349593496
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your sales approval was declined",
            "body": "{{payload.title}}"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000090",
        "source": "a1000002-0002-4002-8002-000000000087",
        "target": "a1000002-0002-4002-8002-000000000088",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000091",
        "source": "a1000002-0002-4002-8002-000000000088",
        "target": "a1000002-0002-4002-8002-000000000089",
        "when": "on_match"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000092",
        "source": "a1000002-0002-4002-8002-000000000089",
        "target": "a1000002-0002-4002-8002-00000000008b",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000097",
        "source": "a1000002-0002-4002-8002-00000000008b",
        "target": "a1000002-0002-4002-8002-00000000008a",
        "when": "on_true",
        "outputIndex": 0
      },
      {
        "id": "a1000002-0002-4002-8002-000000000098",
        "source": "a1000002-0002-4002-8002-00000000008b",
        "target": "a1000002-0002-4002-8002-000000000096",
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
  "exportedAt": "2026-10-28T18:02:02.416Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
