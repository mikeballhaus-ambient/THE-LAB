import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabRuleRecord, LabRuleScope } from '@/shared/types/lab-rule';
import type { LabDomainEventPublishInput } from '@/shared/types/schemas/lab-domain-event-schema';
import type { LabRuleDryRunResultV1 } from '@/shared/types/lab-rule-evaluation';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? body.error ?? `HTTP ${response.status}`);
  }
  return body as T;
}

export async function fetchLabRules(query?: {
  scope?: LabRuleScope;
  ownerUserId?: number;
}): Promise<LabRuleRecord[]> {
  const base = resolvePlatformBackendUrlForClient();
  const params = new URLSearchParams();
  if (query?.scope) {
    params.set('scope', query.scope);
  }
  if (query?.ownerUserId != null) {
    params.set('ownerUserId', String(query.ownerUserId));
  }
  const qs = params.toString();
  const url = `${base}/api/platform/lab-rules${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { rules: LabRuleRecord[] } }>(response);
  return body.data.rules;
}

export async function createLabRule(input: unknown): Promise<LabRuleRecord> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-rules`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { rule: LabRuleRecord } }>(response);
  return body.data.rule;
}

export async function updateLabRule(ruleId: string, input: unknown): Promise<LabRuleRecord> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-rules/${encodeURIComponent(ruleId)}`,
    labPlatformFetchInit({ method: 'PUT', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { rule: LabRuleRecord } }>(response);
  return body.data.rule;
}

export async function deleteLabRule(ruleId: string): Promise<void> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-rules/${encodeURIComponent(ruleId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true }>(response);
}

export async function dryRunLabRule(
  envelope: LabDomainEventPublishInput,
  ruleId?: string,
): Promise<LabRuleDryRunResultV1> {
  const base = resolvePlatformBackendUrlForClient();
  const response = await fetch(
    `${base}/api/platform/lab-rules/dry-run`,
    labPlatformFetchInit({
      method: 'POST',
      body: JSON.stringify({ envelope, ruleId }),
    }),
  );
  const body = await parseJson<{
    success: true;
    data: LabRuleDryRunResultV1;
  }>(response);
  return body.data;
}
