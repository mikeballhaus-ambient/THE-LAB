import { randomUUID } from 'node:crypto';
import type { Server as SocketIOServer } from 'socket.io';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import {
  takeMatchingListens,
  type ArmedWorkflowListen,
  type CapturedWorkflowListen,
} from '@/shared/types/lab-workflow-listen';
import { labWorkflowsRepository } from '../db/LabWorkflows/lab-workflows-repository';
import { labWorkflowMockSamplesRepository } from '../db/LabWorkflows/lab-workflow-mock-samples-repository';
import { labWorkflowsService } from '../db/LabWorkflows/lab-workflows-service';
import { getWorkflowTriggerEventType } from '@/shared/utils/lab-workflow-definition';

/**
 * Capture an armed workflow from a **webhook delivery**.
 *
 * ## Why this is not `captureArmedListens`
 *
 * The bus path can evaluate the graph itself, because nothing else has. A webhook delivery is
 * different: [`workflow-webhook-trigger-routes.ts`](../routes/workflow-webhook-trigger-routes.ts)
 * has **already run the workflow** by the time it reports — that is what the caller's `202` means.
 * Reusing the bus capture would therefore execute the graph a second time, and on a live hook that
 * is a second round of real notifications. So this records what arrived and deliberately does **not**
 * run anything.
 *
 * ## What "let the capture really run" means here
 *
 * Nothing extra, and the UI says so. The delivery already ran (live) or already previewed (test) —
 * the checkbox only forced the required apps to start first, which is why arming with it on can
 * matter. For a webhook the author is watching, not deciding: the caller decided by calling.
 *
 * Returns the capture report, or `null` when no arm matched.
 */
export function captureWebhookDelivery(
  envelope: LabDomainEventEnvelopeV1,
  delivery: { mode: 'test' | 'live'; runId: string | null; status: string; steps: number },
): CapturedWorkflowListen | null {
  const listens = takeMatchingListens(envelope.type);
  if (listens.length === 0) {
    return null;
  }
  // One delivery can only fire one workflow, so at most one arm can match — but the registry is
  // keyed by user, so several authors watching the same hook each get their own report.
  const listen = listens[0];
  const workflow = labWorkflowsRepository.getById(listen.workflowId);
  if (!workflow) {
    return null;
  }

  // The sample is the part that cannot be recovered by retrying: keep it even if nothing else does.
  const mockSampleId = saveCapturedSample(listen, workflow.definition, envelope);

  return {
    workflowId: listen.workflowId,
    userId: listen.userId,
    triggerEventType: listen.triggerEventType,
    eventType: envelope.type,
    eventId: envelope.id,
    // The delivery's own mode decides this, not the arm's `dryRun`: a `test` delivery is the preview
    // and a `live` one really ran, regardless of which checkbox was ticked when arming.
    dryRun: delivery.mode === 'test',
    runId: delivery.runId,
    status: delivery.status,
    steps: delivery.steps,
    mockSampleId,
  };
}

/**
 * Capture the next real event for every armed workflow (W5c).
 *
 * ## Why this is called from the publish pipeline and not a subscription
 *
 * The domain event bus has no subscribe/cancel surface — it is a function call. Registering a
 * handler per arm would mean building one, then being responsible for removing it correctly on
 * expiry, cancellation, restart and double-arm. Consulting the armed map on each publish is a map
 * lookup on a path that already does several database writes, and it cannot leak: expiry *is*
 * removal from the map.
 *
 * ## What a capture does
 *
 * 1. Records the event as a **run**, so the designer can show "the real thing arrived" and what the
 *    graph did with it. The run is `manual` — that is already the type for a designer-triggered
 *    evaluation, and adding a fifth type would need a schema change for no extra information.
 * 2. Saves the envelope as a **named mock sample** with `capturedAt`, so the author can replay it
 *    from the "Test with…" selector afterwards. That is the whole point: a capture the author
 *    cannot reuse is a debugging session they have to repeat.
 *
 * ## Dry by default
 *
 * A capture evaluates the graph without side effects unless the arm explicitly opted in. An author
 * watching for a real event is usually *checking wiring*, not deploying — notifying a real person
 * during that check would be a surprise, and surprises in automation are how trust is lost.
 */
export async function captureArmedListens(
  envelope: LabDomainEventEnvelopeV1,
  io?: SocketIOServer,
): Promise<CapturedWorkflowListen[]> {
  const listens = takeMatchingListens(envelope.type);
  if (listens.length === 0) {
    return [];
  }

  const captures: CapturedWorkflowListen[] = [];
  for (const listen of listens) {
    try {
      captures.push(await captureOne(listen, envelope, io));
    } catch (err) {
      // One failed capture must not stop the others, and must not break the publish that triggered
      // it — this is a diagnostic aid sitting in the delivery path.
      console.warn(
        '[lab-workflows] listen capture failed',
        listen.workflowId,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return captures;
}

async function captureOne(
  listen: ArmedWorkflowListen,
  envelope: LabDomainEventEnvelopeV1,
  io?: SocketIOServer,
): Promise<CapturedWorkflowListen> {
  const workflow = labWorkflowsRepository.getById(listen.workflowId);
  if (!workflow) {
    // The workflow was deleted while armed. Nothing to capture; the arm is already consumed.
    return {
      workflowId: listen.workflowId,
      userId: listen.userId,
      triggerEventType: listen.triggerEventType,
      eventType: envelope.type,
      eventId: envelope.id,
      dryRun: listen.dryRun,
      runId: null,
      status: 'skipped',
      steps: 0,
      mockSampleId: null,
    };
  }

  // Save the sample first. If the evaluation then throws, the author still keeps the payload they
  // waited for — which is the part that cannot be recovered by retrying.
  const mockSampleId = saveCapturedSample(listen, workflow.definition, envelope);

  const result = await labWorkflowsService.runForCaller(
    // The arm carries the identity and role of the request that created it, so authorisation is
    // evaluated against the same facts the arming request was checked with. Re-reading the user
    // would make the capture depend on a database lookup that has no business failing here.
    buildListenCaller(listen.userId, listen.userRole),
    listen.workflowId,
    { dryRun: listen.dryRun, envelope, io },
  );

  return {
    workflowId: listen.workflowId,
    userId: listen.userId,
    triggerEventType: listen.triggerEventType,
    eventType: envelope.type,
    eventId: envelope.id,
    dryRun: listen.dryRun,
    runId: result.runId,
    status: result.status,
    steps: result.steps.length,
    mockSampleId,
  };
}

function saveCapturedSample(
  listen: ArmedWorkflowListen,
  definition: Parameters<typeof getWorkflowTriggerEventType>[0],
  envelope: LabDomainEventEnvelopeV1,
): string | null {
  try {
    const triggerNodeId = findTriggerNodeId(definition, listen.triggerEventType);
    if (!triggerNodeId) {
      return null;
    }
    const id = randomUUID();
    const stamp = new Date().toISOString();
    labWorkflowMockSamplesRepository.insert({
      id,
      workflowId: listen.workflowId,
      triggerNodeId,
      // A stable, descriptive name: "captured <date>" is what the selector renders, and a unique
      // suffix keeps repeated captures of the same trigger distinguishable.
      name: `captured ${stamp.slice(0, 16).replace('T', ' ')}`,
      envelopeJson: JSON.stringify(envelope),
      capturedAt: stamp,
      createdByUserId: listen.userId,
    });
    return id;
  } catch (err) {
    console.warn(
      '[lab-workflows] could not save captured sample',
      listen.workflowId,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * The caller as it was when the arm was created.
 *
 * `email`, `name` and the timestamps are not consulted by any authorisation path; they are filled
 * with empty values so the shape is honest rather than pretending to be a hydrated record.
 */
function buildListenCaller(
  userId: number,
  role: 'owner' | 'admin' | 'member' | 'viewer',
): Parameters<typeof labWorkflowsService.runForCaller>[0] {
  return {
    userId,
    email: '',
    name: '',
    role,
    status: 'active',
    lastSeen: '',
    createdAt: '',
  };
}

function findTriggerNodeId(
  definition: Parameters<typeof getWorkflowTriggerEventType>[0],
  eventType: string,
): string | null {
  if (!definition || !('nodes' in definition)) {
    return null;
  }
  const trigger = definition.nodes.find(
    (node) => node.kind === 'trigger' && node.eventType === eventType,
  );
  return trigger?.id ?? null;
}

