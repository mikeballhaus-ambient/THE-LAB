import { resolvePlatformBackendUrlForClient } from '@/shared/config/resolve-platform-backend-url.client';
import { labPlatformFetchInit } from '@/shared/composables/useLabPlatformAuth';
import type { LabApprovalPolicyRecord, LabApprovalRequestRecord } from '@/shared/types/lab-approval';

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? body.error ?? `HTTP ${response.status}`);
  }
  return body as T;
}

const basePath = () => `${resolvePlatformBackendUrlForClient()}/api/platform/lab-approvals`;

export async function fetchLabApprovalPolicies(): Promise<LabApprovalPolicyRecord[]> {
  const response = await fetch(`${basePath()}/policies`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { policies: LabApprovalPolicyRecord[] } }>(
    response,
  );
  return body.data.policies;
}

export async function createLabApprovalPolicy(input: unknown): Promise<LabApprovalPolicyRecord> {
  const response = await fetch(
    `${basePath()}/policies`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { policy: LabApprovalPolicyRecord } }>(response);
  return body.data.policy;
}

export async function updateLabApprovalPolicy(
  policyId: string,
  input: unknown,
): Promise<LabApprovalPolicyRecord> {
  const response = await fetch(
    `${basePath()}/policies/${encodeURIComponent(policyId)}`,
    labPlatformFetchInit({ method: 'PUT', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { policy: LabApprovalPolicyRecord } }>(response);
  return body.data.policy;
}

export async function deleteLabApprovalPolicy(policyId: string): Promise<void> {
  const response = await fetch(
    `${basePath()}/policies/${encodeURIComponent(policyId)}`,
    labPlatformFetchInit({ method: 'DELETE' }),
  );
  await parseJson<{ success: true }>(response);
}

export async function fetchLabApprovalInbox(): Promise<LabApprovalRequestRecord[]> {
  const response = await fetch(`${basePath()}/inbox`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { requests: LabApprovalRequestRecord[] } }>(
    response,
  );
  return body.data.requests;
}

export async function fetchMyLabApprovalRequests(): Promise<LabApprovalRequestRecord[]> {
  const response = await fetch(`${basePath()}/requests/mine`, labPlatformFetchInit());
  const body = await parseJson<{ success: true; data: { requests: LabApprovalRequestRecord[] } }>(
    response,
  );
  return body.data.requests;
}

export async function fetchLabApprovalRequest(requestId: string): Promise<LabApprovalRequestRecord> {
  const response = await fetch(
    `${basePath()}/requests/${encodeURIComponent(requestId)}`,
    labPlatformFetchInit(),
  );
  const body = await parseJson<{ success: true; data: { request: LabApprovalRequestRecord } }>(
    response,
  );
  return body.data.request;
}

export async function createLabApprovalRequest(input: unknown): Promise<LabApprovalRequestRecord> {
  const response = await fetch(
    `${basePath()}/requests`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { request: LabApprovalRequestRecord } }>(
    response,
  );
  return body.data.request;
}

export async function decideLabApprovalRequest(
  requestId: string,
  input: { decision: 'approve' | 'reject'; comment?: string },
): Promise<LabApprovalRequestRecord> {
  const response = await fetch(
    `${basePath()}/requests/${encodeURIComponent(requestId)}/decide`,
    labPlatformFetchInit({ method: 'POST', body: JSON.stringify(input) }),
  );
  const body = await parseJson<{ success: true; data: { request: LabApprovalRequestRecord } }>(
    response,
  );
  return body.data.request;
}
