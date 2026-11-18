import { DEMO_WORKFLOW_WEBHOOK_LOOP_SNAPSHOT } from '@/shared/seeds/demo-workflows/snapshots/webhook-loop.snapshot';
import { autoArrangeLabWorkflowGraph } from '@/shared/utils/lab-workflow-graph-auto-arrange';
import { arrangeSeedLayoutIfUnpositioned } from '@/shared/utils/lab-workflow-graph-viewport';

/**
 * Webhook envelope type this demo listens on.
 *
 * Three segments (`{appId}.{entity}.{verb}`) to match the catalog convention — the suite asserts it,
 * and a webhook's "entity" is its slug in spirit: one event type can serve several hooks because the
 * payload, not the type, carries the difference.
 */
export const DEMO_WEBHOOK_LOOP_EVENT_TYPE = 'platform-webhook.request.received';

/**
 * Webhook → loop → wait → increment → back to loop; `done` splits on `loopExhausted`.
 *
 * What this demonstrates that the other seeds cannot:
 *
 * - **Dynamic payload.** The webhook accepts any JSON object, so `stepValue` is whatever the caller
 *   sent — the graph never hardcodes a starting count.
 * - **A real cycle.** The increment node's only edge returns to the loop. That back-edge is why
 *   `loop` is a distinct step kind: `walkNode` refuses to re-enter a node, so the loop node drives
 *   its own passes rather than relying on the ordinary walk.
 * - **Bounded iteration with two outcomes.** `maxIterations` caps the run; `done` then takes an IF
 *   on `loopExhausted` so "finished the work" and "ran out of attempts" produce different messages.
 *
 * The counter lives on the **item** (`stepValue`), not on the loop node. Items thread along edges,
 * so writing to the item is what makes the value survive the back-edge — loop state that lives on
 * the node would be invisible to the body.
 */
export function buildDemoWebhookLoopWorkflowDefinition(): import('@/shared/types/lab-workflow-graph').LabWorkflowDefinitionV2 {
  const { nodes, edges, schemaVersion, viewport } = DEMO_WORKFLOW_WEBHOOK_LOOP_SNAPSHOT.definition;
  return {
    schemaVersion,
    nodes: arrangeSeedLayoutIfUnpositioned({ nodes, edges }, autoArrangeLabWorkflowGraph),
    edges,
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
  };
}
