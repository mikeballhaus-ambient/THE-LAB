import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_CRM_SALES_APPROVAL_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000100",
  "name": "CRM: sales approval — request",
  "description": "When a user submits approval on a CRM sales record, raise a request on the CRM sales deal policy.",
  "priority": 320,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000081",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "app-lab-crm.sales.approval_submitted"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000082",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "raise_approval",
          "policyId": "a1000003-0003-4003-8003-000000000010",
          "title": "CRM sales approval",
          "titlePath": "title",
          "descriptionPath": "comment",
          "subjectAppId": "app-lab-crm",
          "subjectEntityTypePath": "entityKey",
          "subjectEntityIdPath": "recordId"
        }
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000083",
        "source": "a1000002-0002-4002-8002-000000000081",
        "target": "a1000002-0002-4002-8002-000000000082",
        "when": "always"
      }
    ],
    "viewport": {
      "x": 225,
      "y": 48.5,
      "zoom": 2
    }
  },
  "exportedAt": "2026-10-28T18:02:02.390Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
