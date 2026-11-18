import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_POLLS_PUBLISHED_NOTIFY_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000129",
  "name": "Polls: notify lab on publish",
  "description": "When `app-polls-surveys.poll.published` fires, notify every seeded lab user (demo cast + admin).",
  "priority": 280,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000129",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "app-polls-surveys.poll.published"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000130",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "notify_users",
          "userIds": [
            1,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12
          ],
          "message": {
            "title": "New poll published",
            "body": "{{payload.question}} — open Polls & Surveys to vote."
          },
          "actions": [
            {
              "kind": "launch_app",
              "label": "Vote now",
              "appId": "app-polls-surveys",
              "hostContext": {
                "catalogOpenPrimaryRecordId": "{{payload.pollId}}"
              }
            }
          ]
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000131",
        "source": "a1000002-0002-4002-8002-000000000129",
        "target": "a1000002-0002-4002-8002-000000000130",
        "when": "always"
      }
    ],
    "viewport": {
      "x": 193.5,
      "y": 46.5,
      "zoom": 2
    }
  },
  "exportedAt": "2026-10-30T00:29:50.744Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
