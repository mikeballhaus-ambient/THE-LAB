import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_TIMESHEET_APPROVAL_RESPONSE_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000125",
  "name": "Time Tracking: timesheet approval — response",
  "description": "When the timesheet policy completes, copy `requestStatus` to `approvalStatus`, then notify the requester (wording branches on outcome).",
  "priority": 74,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000126",
        "kind": "trigger",
        "position": {
          "x": 158,
          "y": 48
        },
        "eventType": "platform-approvals.request.*"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000127",
        "kind": "rule",
        "position": {
          "x": 158,
          "y": 125.61138211382112
        },
        "name": "Time Tracking timesheet",
        "conditions": [
          {
            "kind": "payload_equals",
            "path": "subjectAppId",
            "value": "app-time-tracking"
          },
          {
            "kind": "payload_equals",
            "path": "subjectEntityType",
            "value": "timesheet"
          }
        ]
      },
      {
        "id": "a1000002-0002-4002-8002-000000000128",
        "kind": "action",
        "position": {
          "x": 100.72520325203254,
          "y": 258.4520325203252
        },
        "step": {
          "kind": "integration_update",
          "providerAppId": "app-time-tracking",
          "serviceId": "time-tracking.timesheets",
          "recordIdPath": "subjectEntityId",
          "bodyFromPayload": {
            "approvalStatus": "requestStatus"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000129",
        "kind": "action",
        "position": {
          "x": 130.38536585365853,
          "y": 346.2910569105691
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
        "id": "a1000002-0002-4002-8002-000000000130",
        "kind": "action",
        "position": {
          "x": -29.730081300813012,
          "y": 500.609756097561
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your timesheet was approved",
            "body": "{{payload.title}}"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000131",
        "kind": "action",
        "position": {
          "x": 243.45365853658535,
          "y": 498.5642276422765
        },
        "step": {
          "kind": "notify_users",
          "userIds": [],
          "path": "requesterUserId",
          "message": {
            "title": "Your timesheet was declined",
            "body": "{{payload.title}}"
          }
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000132",
        "source": "a1000002-0002-4002-8002-000000000126",
        "target": "a1000002-0002-4002-8002-000000000127",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000133",
        "source": "a1000002-0002-4002-8002-000000000127",
        "target": "a1000002-0002-4002-8002-000000000128",
        "when": "on_match"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000134",
        "source": "a1000002-0002-4002-8002-000000000128",
        "target": "a1000002-0002-4002-8002-000000000129",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000135",
        "source": "a1000002-0002-4002-8002-000000000129",
        "target": "a1000002-0002-4002-8002-000000000130",
        "when": "on_true",
        "outputIndex": 0
      },
      {
        "id": "a1000002-0002-4002-8002-000000000136",
        "source": "a1000002-0002-4002-8002-000000000129",
        "target": "a1000002-0002-4002-8002-000000000131",
        "when": "on_false",
        "outputIndex": 1
      }
    ],
    "viewport": {
      "x": 193.68759936406997,
      "y": -15.931637519872822,
      "zoom": 0.9777424483306836
    }
  },
  "exportedAt": "2026-10-29T21:02:18.778Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
