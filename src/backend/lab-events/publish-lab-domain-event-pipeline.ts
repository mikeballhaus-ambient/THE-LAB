import type { Server as SocketIOServer } from 'socket.io';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import { labEventsService } from '../db/LabEvents/lab-events-service';
import { isLabBusRulesEvaluationEnabled } from '@/shared/config/lab-automation-pipeline';
import { evaluateRulesForDomainEvent } from '../lab-rules/lab-rules-evaluator';
import { evaluateWorkflowsForDomainEvent } from '../lab-workflows/lab-workflows-evaluator';
import { captureArmedListens } from '../lab-workflows/lab-workflow-listen-capture';
import { handleKbRagDomainEvent } from '../chroma/kb-chunks-ingest-on-domain-event';

export interface PublishLabDomainEventPipelineOptions {
  /** When false, skips rules evaluation (e.g. publishing `platform-rules.evaluation.completed`). */
  runRulesEvaluation?: boolean;
  /**
   * When false, the caller has **already** persisted the event row and only wants its side effects.
   *
   * Exists for the requirement sweep: `lab_user_notifications.event_id` is a foreign key, so the row
   * must exist *before* a notify node runs. Persisting there and then letting the pipeline persist
   * again would violate the primary key — and doing the insert twice with different ids would make
   * the event appear twice in the admin view.
   */
  persistEvent?: boolean;
}

/** Publish from platform code with the same side effects as HTTP lab-events publish. */
export async function publishLabDomainEventPipeline(
  envelope: LabDomainEventEnvelopeV1,
  actorUserId: number | undefined,
  io?: SocketIOServer,
  pipelineOptions?: PublishLabDomainEventPipelineOptions,
): Promise<void> {
  if (pipelineOptions?.persistEvent !== false) {
    await labEventsService.publish(envelope, actorUserId);
  }

  // Armed listeners (W5c) are served **before** the normal workflow evaluation, so a capture
  // reflects the raw event rather than a mutated one, and a workflow that is armed is still
  // evaluated by its ordinary trigger below only if it is enabled — arming does not enable it.
  await captureArmedListens(envelope, io);

  const runBusRules =
    pipelineOptions?.runRulesEvaluation === true ||
    (pipelineOptions?.runRulesEvaluation !== false && isLabBusRulesEvaluationEnabled());
  if (runBusRules) {
    await evaluateRulesForDomainEvent(envelope, { io, fromRuleEngine: false });
  }
  await evaluateWorkflowsForDomainEvent(envelope, { io, fromWorkflowEngine: false });

  void handleKbRagDomainEvent(envelope).catch(() => undefined);
}
