import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_TIMESHEET_APPROVAL_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000118",
  "name": "Time Tracking: timesheet approval — request",
  "description": "When Time Tracking submits a week, open the seeded timesheet approval policy for that `weekKey`.",
  "priority": 75,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000120",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "app-time-tracking.timesheet.submitted"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000121",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "raise_approval",
          "policyId": "a1000003-0003-4003-8003-000000000012",
          "title": "Timesheet approval",
          "titlePath": "weekKey",
          "description": "Submitted weekly time entries require manager approval.",
          "subjectAppId": "app-time-tracking",
          "subjectEntityType": "timesheet",
          "subjectEntityIdPath": "weekKey"
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000122",
        "source": "a1000002-0002-4002-8002-000000000120",
        "target": "a1000002-0002-4002-8002-000000000121",
        "when": "always"
      }
    ],
    "viewport": {
      "x": 249,
      "y": 48.5,
      "zoom": 2
    }
  },
  "exportedAt": "2026-10-28T18:02:02.474Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
