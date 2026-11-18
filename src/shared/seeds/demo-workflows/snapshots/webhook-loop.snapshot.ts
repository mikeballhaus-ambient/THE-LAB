import type { LabWorkflowDefinitionV2 } from '@/shared/types/lab-workflow-graph';

/** Live DB export — do not hand-edit; run `npm run apply:demo-workflow-seeds`. */
export const DEMO_WORKFLOW_WEBHOOK_LOOP_SNAPSHOT = {
  "id": "a1000002-0002-4002-8002-000000000070",
  "name": "Demo: webhook loop with counter",
  "description": "Accepts any webhook JSON, loops while `stepValue` is below 3, waits 3s and increments `stepValue` each pass, then messages whether it reached 3 or hit the iteration cap (POST { \"stepValue\": 1 }).",
  "priority": 60,
  "definition": {
    "schemaVersion": 2,
    "nodes": [
      {
        "id": "a1000002-0002-4002-8002-000000000071",
        "kind": "trigger",
        "position": {
          "x": 147.7014714204867,
          "y": 7.088873266836451
        },
        "eventType": "platform-webhook.request.received",
        "mapping": [
          {
            "from": "stepValue",
            "to": "stepValue"
          },
          {
            "from": "userId",
            "to": "userId"
          }
        ]
      },
      {
        "id": "a1000002-0002-4002-8002-000000000072",
        "kind": "action",
        "position": {
          "x": 149.47707979626486,
          "y": 227.22750424448208
        },
        "step": {
          "kind": "loop",
          "maxIterations": 3,
          "while": [
            {
              "kind": "payload_less_than",
              "path": "stepValue",
              "value": "3"
            }
          ]
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000073",
        "kind": "action",
        "position": {
          "x": -172.26315789473688,
          "y": 325.4320882852292
        },
        "step": {
          "kind": "wait",
          "amount": 3,
          "unit": "seconds"
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000074",
        "kind": "action",
        "position": {
          "x": -177.58998302207138,
          "y": 428.144312393888
        },
        "step": {
          "kind": "code",
          "source": "(items) => {\n  // `items` is always an array — a trigger seeds one item per event.\n  return items.map((item) => {\n    // Increment `stepValue`, treating a missing value as 0 so a repeat call still advances.\n    return { ...item, stepValue: (item.stepValue ?? 0) + 1 }\n  })\n}"
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000075",
        "kind": "action",
        "position": {
          "x": 259.2096774193549,
          "y": 353.37775891341255
        },
        "step": {
          "kind": "if_condition",
          "conditions": [
            {
              "kind": "payload_equals",
              "path": "stepValue",
              "value": "3"
            }
          ]
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000076",
        "kind": "action",
        "position": {
          "x": 460.29626485568764,
          "y": 494.44312393887947
        },
        "step": {
          "kind": "notify_users",
          "userIds": [
            1
          ],
          "message": {
            "title": "Loop demo — completed",
            "body": "The loop finished before reaching its cap."
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000077",
        "kind": "action",
        "position": {
          "x": 30,
          "y": 84
        },
        "groupId": "cdafbaed-38c7-436a-9b58-4fd169f3733e",
        "step": {
          "kind": "notify_users",
          "userIds": [
            1
          ],
          "message": {
            "title": "Loop demo — success",
            "body": "Workflow successfully incremented stepValue to 3"
          }
        }
      },
      {
        "id": "a1000002-0002-4002-8002-000000000078",
        "kind": "action",
        "position": {
          "x": 30,
          "y": 186
        },
        "groupId": "cdafbaed-38c7-436a-9b58-4fd169f3733e",
        "step": {
          "kind": "comms_system_dm_payload_user",
          "path": "userId",
          "text": "Loop demo finished: stepValue reached {{payload.stepValue}}."
        }
      },
      {
        "id": "c3780354-808b-4678-b81a-5fecbbb70f4b",
        "kind": "action",
        "position": {
          "x": 278.790039615167,
          "y": 106.13661632239197
        },
        "step": {
          "kind": "if_condition",
          "conditions": [
            {
              "kind": "payload_exists",
              "path": "stepValue"
            }
          ]
        }
      },
      {
        "id": "cad2116e-9554-4aa2-8d15-cc5d4b12d4c7",
        "kind": "action",
        "position": {
          "x": 438.40185519241663,
          "y": 264.8593587884361
        },
        "step": {
          "kind": "notify_users",
          "userIds": [
            1
          ],
          "message": {
            "title": "Loop demo — missing required property",
            "body": "stepValue not supplied in request"
          }
        }
      },
      {
        "id": "cdafbaed-38c7-436a-9b58-4fd169f3733e",
        "kind": "group",
        "position": {
          "x": 21.864346698437487,
          "y": 498.180220945898
        },
        "label": "Action group",
        "width": 320,
        "height": 392,
        "groupType": "actions",
        "executionMode": "sequential",
        "failurePolicy": "stop",
        "ruleCombine": "sequential_first_match",
        "continueOnNoMatch": false
      }
    ],
    "edges": [
      {
        "id": "a1000002-0002-4002-8002-000000000082",
        "source": "a1000002-0002-4002-8002-000000000072",
        "target": "a1000002-0002-4002-8002-000000000073",
        "when": "always",
        "outputIndex": 0
      },
      {
        "id": "a1000002-0002-4002-8002-000000000083",
        "source": "a1000002-0002-4002-8002-000000000073",
        "target": "a1000002-0002-4002-8002-000000000074",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000084",
        "source": "a1000002-0002-4002-8002-000000000074",
        "target": "a1000002-0002-4002-8002-000000000072",
        "when": "always"
      },
      {
        "id": "a1000002-0002-4002-8002-000000000085",
        "source": "a1000002-0002-4002-8002-000000000072",
        "target": "a1000002-0002-4002-8002-000000000075",
        "when": "always",
        "outputIndex": 1
      },
      {
        "id": "a1000002-0002-4002-8002-000000000087",
        "source": "a1000002-0002-4002-8002-000000000075",
        "target": "a1000002-0002-4002-8002-000000000076",
        "when": "on_false",
        "outputIndex": 1
      },
      {
        "id": "1cb26305-a6a4-42bd-bd70-dc41e8eed431",
        "source": "a1000002-0002-4002-8002-000000000071",
        "target": "c3780354-808b-4678-b81a-5fecbbb70f4b",
        "when": "always"
      },
      {
        "id": "49663416-7e62-4b66-ba46-aa13d1f447ff",
        "source": "c3780354-808b-4678-b81a-5fecbbb70f4b",
        "target": "a1000002-0002-4002-8002-000000000072",
        "when": "on_true",
        "outputIndex": 0
      },
      {
        "id": "c5c5d4f1-0cb5-4cf6-b786-650e239a4437",
        "source": "c3780354-808b-4678-b81a-5fecbbb70f4b",
        "target": "cad2116e-9554-4aa2-8d15-cc5d4b12d4c7",
        "when": "on_false",
        "outputIndex": 1
      },
      {
        "id": "361547d6-5724-4221-9bd3-4f249e1ae763",
        "source": "a1000002-0002-4002-8002-000000000075",
        "target": "cdafbaed-38c7-436a-9b58-4fd169f3733e",
        "when": "on_true",
        "outputIndex": 0
      }
    ],
    "viewport": {
      "x": 345.2550963243053,
      "y": 26.047132080805227,
      "zoom": 0.6986819671844797
    }
  },
  "exportedAt": "2026-10-28T18:02:02.502Z"
} as {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  definition: LabWorkflowDefinitionV2;
  exportedAt: string;
};
