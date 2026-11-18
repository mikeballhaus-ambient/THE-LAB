import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabWorkflowWebhookMode } from '@/shared/types/lab-workflow-webhook';

/**
 * Webhook management for the designer (phase 37).
 *
 * A hook carries its plaintext secrets, so the panel can render both URLs on every load rather than
 * only in the create response. `''` means the secret is not recoverable (seeded row, or one minted
 * before the secret was stored) — regenerate to get a URL then.
 */

export interface LabWorkflowPayloadShapeFieldDto {
  path: string;
  type: string;
}

export interface LabWorkflowWebhookDto {
  id: string;
  name: string;
  slug: string;
  eventType: string;
  enabled: boolean;
  /** False means the live endpoint accepts unsigned calls — surfaced in the UI, not blocked. */
  signed: boolean;
  lastReceivedAt: string | null;
  mappingSourceJson: string | null;
  mappingSourceCapturedAt: string | null;
  /** Plaintext test secret, or `''` when it cannot be shown. Never populated for a `viewer`. */
  testSecret: string;
  /** Plaintext live secret, or `''`. Never populated for a `viewer`. */
  liveSecret: string;
  latestTestShape: {
    capturedAt: string;
    fields: LabWorkflowPayloadShapeFieldDto[];
  } | null;
  latestLiveShape: { capturedAt: string } | null;
}

export interface LabWorkflowWebhookCreated {
  webhook: LabWorkflowWebhookDto;
  secrets: { test: string; live: string };
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? body.error ?? `HTTP ${response.status}`);
  }
  return body as T;
}

function base(workflowId: string): string {
  return `${resolvePlatformBackendUrlForClient()}/api/platform/lab-workflows/${encodeURIComponent(workflowId)}/webhooks`;
}

export async function fetchLabWorkflowWebhooks(
  workflowId: string,
): Promise<LabWorkflowWebhookDto[]> {
  const response = await fetch(base(workflowId), labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { webhooks: LabWorkflowWebhookDto[] } }>(
    response,
  );
  return body.data.webhooks;
}

/**
 * Mint a test/live pair.
 *
 * The caller must show `secrets` and then discard them: they are not retrievable afterwards, by
 * design — a GET that returned them would make every screenshot a working URL.
 */
export async function createLabWorkflowWebhook(
  workflowId: string,
  input: { name: string; slug?: string; triggerNodeId: string; eventType: string },
): Promise<LabWorkflowWebhookCreated> {
  const response = await fetch(
    base(workflowId),
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: LabWorkflowWebhookCreated }>(response);
  return body.data;
}

/**
 * Adopt the latest captured shape as the mapping source.
 *
 * Returns suggestions, **not** an applied mapping: adopting a shape is not the same as agreeing with
 * a mapping, and silently re-pointing `from` paths would guess at intent.
 */
export async function adoptLabWorkflowWebhookShape(
  workflowId: string,
  webhookId: string,
  mode: LabWorkflowWebhookMode,
): Promise<{
  capturedAt: string;
  fields: LabWorkflowPayloadShapeFieldDto[];
  suggestedMapping: { from: string; to: string }[];
}> {
  const response = await fetch(
    `${base(workflowId)}/${encodeURIComponent(webhookId)}/mapping-source`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify({ mode }) }),
  );
  const body = await parseJson<{
    success: true;
    data: {
      capturedAt: string;
      fields: LabWorkflowPayloadShapeFieldDto[];
      suggestedMapping: { from: string; to: string }[];
    };
  }>(response);
  return body.data;
}

/**
 * Mint a fresh secret for one mode, or both.
 *
 * Deliberately separate from create: regenerating invalidates the URL anyone is already calling, so
 * it must be an explicit act rather than a side effect.
 */
export async function regenerateLabWorkflowWebhookSecrets(
  workflowId: string,
  webhookId: string,
  mode: 'test' | 'live' | 'all' = 'all',
): Promise<LabWorkflowWebhookDto | null> {
  const response = await fetch(
    `${base(workflowId)}/${encodeURIComponent(webhookId)}/secrets`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify({ mode }) }),
  );
  const body = await parseJson<{
    success: true;
    data: { webhook: LabWorkflowWebhookDto | null };
  }>(response);
  return body.data.webhook;
}

export async function deleteLabWorkflowWebhook(
  workflowId: string,
  webhookId: string,
): Promise<void> {
  const response = await fetch(
    `${base(workflowId)}/${encodeURIComponent(webhookId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true }>(response);
}
