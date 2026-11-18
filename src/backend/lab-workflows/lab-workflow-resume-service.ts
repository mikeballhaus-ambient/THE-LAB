import type { Server as SocketIOServer } from 'socket.io';
import type { LabDomainEventEnvelopeV1 } from '@/shared/types/lab-domain-event';
import type { LabWorkflowItem } from '@/shared/types/lab-workflow-items';
import {
  LAB_WORKFLOW_RESUME_MAX_ITEMS_BYTES,
  LAB_WORKFLOW_RESUME_MAX_PER_TICK,
} from '@/shared/types/lab-workflow-run-resume';
import { labWorkflowRunResumesRepository } from '../db/LabWorkflows/lab-workflow-run-resumes-repository';
import { labWorkflowsRepository } from '../db/LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from '../db/LabWorkflows/lab-workflow-runs-repository';
import { isLabWorkflowDefinitionV2 } from '@/shared/utils/lab-workflow-definition';
import { resumeWorkflowGraphAfterSuspend } from './lab-workflow-graph-evaluator';
import { beginWorkflowRun } from './lab-workflow-run-recorder';
import { VSCodeLogger } from '../utils/logger';

export interface ResumeTickResult {
  due: number;
  resumed: number;
  skipped: number;
  failed: number;
}

/**
 * Persist a run's suspension (phase 36).
 *
 * Called by the evaluator through `onSuspend`. The item array is the payload: `wait` passes its
 * input through unchanged, so these are exactly the items the next node needs.
 *
 * Over the size cap the run is finished `failed` rather than storing a truncated array — a resumed
 * run handed partial items would continue with wrong data and no indication that anything was lost.
 */
export async function persistRunSuspension(params: {
  runId: string | null;
  workflowId: string;
  nodeId: string;
  items: readonly LabWorkflowItem[];
  resumeAt: string;
}): Promise<void> {
  if (!params.runId) {
    // A dry run has no row and therefore nothing to resume. The graph stopping at the wait is the
    // correct outcome for a preview.
    return;
  }

  const itemsJson = JSON.stringify(params.items);
  if (Buffer.byteLength(itemsJson, 'utf8') > LAB_WORKFLOW_RESUME_MAX_ITEMS_BYTES) {
    labWorkflowRunsRepository.finishRun({
      runId: params.runId,
      status: 'failed',
      error:
        `Cannot suspend at "${params.nodeId}": the items to carry over exceed ` +
        `${LAB_WORKFLOW_RESUME_MAX_ITEMS_BYTES} bytes. Reduce the batch (Filter/Sort/Limit before the wait).`,
      finishedAt: new Date().toISOString(),
    });
    const logger = await VSCodeLogger.getInstance();
    logger.warn(
      `[lab-workflows] run ${params.runId} cannot suspend — ${itemsJson.length} bytes of items`,
    );
    return;
  }

  labWorkflowRunResumesRepository.insert({
    runId: params.runId,
    workflowId: params.workflowId,
    nodeId: params.nodeId,
    itemsJson,
    resumeAt: params.resumeAt,
  });
}

/**
 * Resume one suspended run.
 *
 * The run row is reused rather than a second run opened: this is the *same* execution continuing,
 * and the history should read as one run that paused, not two runs that each did half the work.
 */
async function resumeOne(
  resume: { runId: string; workflowId: string; nodeId: string; itemsJson: string },
  io: SocketIOServer | undefined,
): Promise<void> {
  const logger = await VSCodeLogger.getInstance();
  const workflow = labWorkflowsRepository.getById(resume.workflowId);
  if (!workflow) {
    // Workflow deleted; the resume row cascades away, but a row read before the delete can still
    // arrive here. Nothing to run and nothing to report against.
    labWorkflowRunResumesRepository.delete(resume.runId);
    return;
  }

  const run = labWorkflowRunsRepository.getRun(resume.runId);
  // `envelope_json` is the stored envelope as a string; the resume path needs it as an object.
  const envelope = run?.envelopeJson
    ? (JSON.parse(run.envelopeJson) as LabDomainEventEnvelopeV1)
    : undefined;
  if (!run || !envelope) {
    labWorkflowRunResumesRepository.delete(resume.runId);
    logger.warn(`[lab-workflows] resume ${resume.runId} has no run row or envelope; dropped`);
    return;
  }

  if (!isLabWorkflowDefinitionV2(workflow.definition)) {
    labWorkflowRunResumesRepository.delete(resume.runId);
    logger.warn(`[lab-workflows] resume ${resume.runId} targets a v1 definition; dropped`);
    return;
  }

  const items = JSON.parse(resume.itemsJson) as LabWorkflowItem[];

  try {
    await resumeWorkflowGraphAfterSuspend(
      workflow.definition,
      envelope,
      workflow.name,
      workflow.scope,
      workflow.ownerUserId,
      resume.nodeId,
      items,
      {
        io,
        // The run row already exists, so the handle is a thin wrapper that appends steps to it
        // rather than opening a new one.
        run: beginWorkflowRun({
          workflowId: workflow.id,
          triggerType: run.triggerType,
          envelope,
          existingRunId: resume.runId,
        }),
      },
    );
    labWorkflowRunResumesRepository.delete(resume.runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'resume failed';
    labWorkflowRunsRepository.finishRun({
      runId: resume.runId,
      status: 'failed',
      error: message,
      finishedAt: new Date().toISOString(),
    });
    labWorkflowRunResumesRepository.delete(resume.runId);
    logger.warn(`[lab-workflows] resume ${resume.runId} failed: ${message}`);
  }
}

/**
 * Resume everything the clock owes.
 *
 * Runs **after** the schedule pass: a scheduled trigger is time-critical, a resume can tolerate one
 * tick of latency. Bounded per tick so a backlog from a long outage cannot stall the ticker — the
 * next tick picks up the remainder, which is why `listDue` orders by `resume_at`.
 *
 * Claiming is what makes this safe to run concurrently or after a restart: `claim()` is a
 * conditional update, and only the tick that wins it does the work.
 */
export async function resumeDueRuns(
  nowIso: string,
  io: SocketIOServer | undefined,
): Promise<ResumeTickResult> {
  const logger = await VSCodeLogger.getInstance();
  let due;
  try {
    due = labWorkflowRunResumesRepository.listDue(nowIso, LAB_WORKFLOW_RESUME_MAX_PER_TICK);
  } catch (err) {
    // The resume queue is auxiliary: a tick that cannot read it (a test database built without the
    // table, a host with no LabWorkflows repository bound) must still fire schedules. Losing one
    // tick of resumes is recoverable; losing every schedule silently is not.
    logger.warn(
      `[lab-workflows] resume queue unavailable, skipping resume pass: ` +
        (err instanceof Error ? err.message : String(err)),
    );
    return { due: 0, resumed: 0, skipped: 0, failed: 0 };
  }
  const result: ResumeTickResult = { due: due.length, resumed: 0, skipped: 0, failed: 0 };

  for (const resume of due) {
    if (!labWorkflowRunResumesRepository.claim(resume.runId, nowIso)) {
      // Another tick (or another backend) took it.
      result.skipped += 1;
      continue;
    }
    try {
      await resumeOne(resume, io);
      result.resumed += 1;
    } catch (err) {
      result.failed += 1;
      logger.warn(
        `[lab-workflows] resume dispatch failed for ${resume.runId}: ` +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  return result;
}
