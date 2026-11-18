import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabWorkflowRecord, LabWorkflowScope } from '@/shared/types/lab-workflow';
import type {
  LabWorkflowManualRunResult,
  LabWorkflowRun,
  LabWorkflowRunStep,
  LabWorkflowTriggerType,
} from '@/shared/types/lab-workflow-run';
import type { LabWorkflowMockSample } from '@/shared/types/lab-workflow-mock-sample';
import type { ArmedWorkflowListen } from '@/shared/types/lab-workflow-listen';
import type { LabWorkflowSchedule } from '@/shared/types/lab-workflow-schedule';
import type {
  LabWorkflowPrepareAppsResult,
  LabWorkflowRequiredAppsSummary,
} from '@/shared/types/lab-workflow-required-apps';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? body.error ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export async function fetchLabWorkflows(query?: {
  scope?: LabWorkflowScope;
  ownerUserId?: number;
}): Promise<LabWorkflowRecord[]> {
  const base = resolvePlatformBackendUrlForClient();
  const params = new URLSearchParams();
  if (query?.scope) {
    params.set('scope', query.scope);
  }
  if (query?.ownerUserId != null) {
    params.set('ownerUserId', String(query.ownerUserId));
  }
  const qs = params.toString();
  const url = `${base}/api/platform/lab-workflows${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { workflows: LabWorkflowRecord[] } }>(response);
  return body.data.workflows;
}

export async function createLabWorkflow(input: unknown): Promise<LabWorkflowRecord> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { workflow: LabWorkflowRecord } }>(response);
  return body.data.workflow;
}

export async function updateLabWorkflow(workflowId: string, input: unknown): Promise<LabWorkflowRecord> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}`,
    labPlatformFetchInit({ method: 'PUT', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { workflow: LabWorkflowRecord } }>(response);
  return body.data.workflow;
}

/**
 * Run or preview one workflow (W5a).
 *
 * `dryRun` is required rather than defaulted at this layer: the caller is a button, and a button
 * that silently chose the side-effecting version would be the bug. The server also defaults to dry
 * if the flag is omitted, so both layers fail safe.
 */
export async function runLabWorkflow(
  workflowId: string,
  options: {
    dryRun: boolean;
    envelope?: unknown;
    mockSampleId?: string | null;
    prepareApps?: boolean;
  },
): Promise<LabWorkflowManualRunResult> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/run`,
    labPlatformFetchInit({
      method: 'POST',
      body: JSON.stringify({
        dryRun: options.dryRun,
        envelope: options.envelope,
        mockSampleId: options.mockSampleId ?? undefined,
        prepareApps: options.prepareApps === true ? true : undefined,
      }),
    }),
  );
  const body = await parseJson<{ success: true; data: LabWorkflowManualRunResult }>(response);
  return body.data;
}

export async function fetchLabWorkflowRequiredApps(
  workflowId: string,
): Promise<LabWorkflowRequiredAppsSummary> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/required-apps`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: LabWorkflowRequiredAppsSummary }>(response);
  return body.data;
}

export async function prepareLabWorkflowRequiredApps(
  workflowId: string,
): Promise<LabWorkflowPrepareAppsResult> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/prepare-apps`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify({}) }),
  );
  const body = await parseJson<{ success: true; data: LabWorkflowPrepareAppsResult }>(response);
  return body.data;
}

/**
 * Arm this workflow for the next real trigger (W5c).
 *
 * `dryRun` is required at this layer for the same reason it is on a manual run: the caller is a
 * button, and a button that silently chose the side-effecting version would be the bug.
 */
export async function armLabWorkflowListen(
  workflowId: string,
  options: { dryRun: boolean },
): Promise<{ listen: ArmedWorkflowListen; ttlMs: number; webhookListeningSupported: boolean }> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/listen`,
    labPlatformFetchInit({
      method: 'POST',
      body: JSON.stringify({ dryRun: options.dryRun }),
    }),
  );
  const body = await parseJson<{
    success: true;
    data: { listen: ArmedWorkflowListen; ttlMs: number; webhookListeningSupported: boolean };
  }>(response);
  return body.data;
}

export async function fetchLabWorkflowListen(
  workflowId: string,
): Promise<ArmedWorkflowListen | null> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/listen`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: { listen: ArmedWorkflowListen | null } }>(
    response,
  );
  return body.data.listen;
}

export async function disarmLabWorkflowListen(workflowId: string): Promise<boolean> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/listen`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  const body = await parseJson<{ success: true; data: { disarmed: boolean } }>(response);
  return body.data.disarmed;
}

/**
 * Effective schedules for a workflow, including `nextFireAt` / `lastFiredAt`.
 *
 * There is no matching write function here, by design: a schedule is authored by editing the trigger
 * node's `schedule` field and saving the workflow (or with `lab_workflow_set_schedule`). See
 * `platform-lab-workflows-routes.ts` for why.
 */
export async function fetchLabWorkflowSchedules(
  workflowId: string,
): Promise<LabWorkflowSchedule[]> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/schedules`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: { schedules: LabWorkflowSchedule[] } }>(
    response,
  );
  return body.data.schedules;
}

export async function fetchLabWorkflowMockSamples(
  workflowId: string,
): Promise<LabWorkflowMockSample[]> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/mocks`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: { mocks: LabWorkflowMockSample[] } }>(response);
  return body.data.mocks;
}

export async function createLabWorkflowMockSample(
  workflowId: string,
  input: { triggerNodeId: string; name: string; envelope: unknown },
): Promise<LabWorkflowMockSample> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/mocks`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { mock: LabWorkflowMockSample } }>(response);
  return body.data.mock;
}

export async function deleteLabWorkflowMockSample(
  workflowId: string,
  mockId: string,
): Promise<void> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/mocks/${encodeURIComponent(mockId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true }>(response);
}

/**
 * Execution history for the Logs tab.
 *
 * `kind: 'manual'` is the Test list, `'live'` is event / schedule / webhook. Omit it for everything.
 * The split is applied server-side because both lists share one 200-row retention window — a client
 * slice could show an empty Live list while manual runs filled the table.
 */
export async function fetchLabWorkflowRuns(
  workflowId: string,
  options: { kind?: 'manual' | 'live'; limit?: number } = {},
): Promise<LabWorkflowRun[]> {
  const base = resolvePlatformBackendUrlForClient();
  const params = new URLSearchParams();
  if (options.kind) {
    params.set('kind', options.kind);
  }
  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/runs${suffix}`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: { runs: LabWorkflowRun[] } }>(response);
  return body.data.runs;
}

/**
 * Delete run-history rows.
 *
 * One request for the whole selection: the caller deletes what they ticked, and splitting it into N
 * calls would leave a half-deleted selection whenever one of them failed.
 */
export async function deleteLabWorkflowRuns(
  workflowId: string,
  runIds: readonly string[],
): Promise<number> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/runs/delete`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify({ runIds }) }),
  );
  const body = await parseJson<{ success: true; data: { deleted: number } }>(response);
  return body.data.deleted;
}

/** One run plus its executed steps — what the Logs details modal renders. */
export async function fetchLabWorkflowRunDetail(
  workflowId: string,
  runId: string,
): Promise<{ run: LabWorkflowRun; steps: LabWorkflowRunStep[] }> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{
    success: true;
    data: { run: LabWorkflowRun; steps: LabWorkflowRunStep[] };
  }>(response);
  return body.data;
}

/** Trigger label for a run row, so history can say *why* it ran. */
export function formatLabWorkflowTriggerType(triggerType: LabWorkflowTriggerType): string {
  switch (triggerType) {
    case 'event':
      return 'Event';
    case 'manual':
      return 'Manual';
    case 'schedule':
      return 'Schedule';
    case 'webhook':
      return 'Webhook';
    default:
      return triggerType;
  }
}

export async function deleteLabWorkflow(workflowId: string): Promise<void> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true }>(response);
}
