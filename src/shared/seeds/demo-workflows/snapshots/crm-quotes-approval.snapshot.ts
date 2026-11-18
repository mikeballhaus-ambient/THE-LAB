import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_CRM_QUOTES_APPROVAL_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000101",
  "name": "CRM: quote approval — request",
  "description": "When a user submits approval on a CRM quote record, raise a request on the CRM quote policy.",
  "priority": 315,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000084",
        "kind": "trigger",
        "position": {
          "x": 48,
          "y": 48
        },
        "eventType": "app-lab-crm.quotes.approval_submitted"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000085",
        "kind": "action",
        "position": {
          "x": 48,
          "y": 188
        },
        "step": {
          "kind": "raise_approval",
          "policyId": "a1000003-0003-4003-8003-000000000011",
          "title": "CRM quote approval",
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
        "id": "a1000002-0002-4002-8002-000000000086",
        "source": "a1000002-0002-4002-8002-000000000084",
        "target": "a1000002-0002-4002-8002-000000000085",
        "when": "always"
      }
    ],
    "viewport": {
      "x": 218,
      "y": 48.5,
      "zoom": 2
    }
  },
  "exportedAt": "2026-10-28T18:02:02.399Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
