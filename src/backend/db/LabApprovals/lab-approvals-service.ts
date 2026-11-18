import { randomUUID } from 'node:crypto';
import type { Server as SocketIOServer } from 'socket.io';
import { labApprovalsRepository } from './lab-approvals-repository';
import type { LabApprovalPolicyRecord, LabApprovalRequestRecord } from '@/shared/types/lab-approval';
import { LAB_APPROVALS_SOURCE_APP_ID } from '@/shared/types/lab-approval';
import {
  parseLabApprovalDecision,
  parseLabApprovalPolicyCreate,
  parseLabApprovalPolicyDefinition,
  parseLabApprovalPolicyUpdate,
  parseLabApprovalRequestCreate,
} from '@/shared/types/schemas/lab-approval-schema';
import type { User } from '@/shared/types/user';
import { publishLabDomainEventPipeline } from '../../lab-events/publish-lab-domain-event-pipeline';
import { emitLabApprovalsInboxChanged } from '../../lab-events/lab-events-notify';

export function isPlatformApprovalsAdmin(user: User): boolean {
  return user.role === 'owner' || user.role === 'admin';
}

export class LabApprovalsService {
  private static instance: LabApprovalsService | null = null;

  private constructor() {}

  static getInstance(): LabApprovalsService {
    if (!LabApprovalsService.instance) {
      LabApprovalsService.instance = new LabApprovalsService();
    }
    return LabApprovalsService.instance;
  }

  listPoliciesForCaller(caller: User): LabApprovalPolicyRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    const all = labApprovalsRepository.listPolicies();
    if (isPlatformApprovalsAdmin(caller)) {
      return all;
    }
    return all.filter((p) => p.enabled);
  }

  createPolicyForCaller(caller: User, body: unknown): LabApprovalPolicyRecord {
    if (!isPlatformApprovalsAdmin(caller)) {
      throw new LabApprovalsError('FORBIDDEN', 'Only admins can manage approval policies');
    }
    const parsed = parseLabApprovalPolicyCreate(body);
    const definition = parseLabApprovalPolicyDefinition(parsed.definition);
    const record: LabApprovalPolicyRecord = {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      enabled: parsed.enabled,
      createdByUserId: caller.userId,
      definition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    labApprovalsRepository.insertPolicy({
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      enabled: record.enabled,
      createdByUserId: record.createdByUserId,
      definitionJson: JSON.stringify(record.definition),
    });
    return record;
  }

  updatePolicyForCaller(caller: User, policyId: string, body: unknown): LabApprovalPolicyRecord {
    if (!isPlatformApprovalsAdmin(caller)) {
      throw new LabApprovalsError('FORBIDDEN', 'Only admins can manage approval policies');
    }
    const existing = labApprovalsRepository.getPolicyById(policyId);
    if (!existing) {
      throw new LabApprovalsError('NOT_FOUND', 'Policy not found');
    }
    const parsed = parseLabApprovalPolicyUpdate(body);
    const next: LabApprovalPolicyRecord = {
      ...existing,
      name: parsed.name ?? existing.name,
      description: parsed.description ?? existing.description,
      enabled: parsed.enabled ?? existing.enabled,
      definition: parsed.definition
        ? parseLabApprovalPolicyDefinition(parsed.definition)
        : existing.definition,
      updatedAt: new Date().toISOString(),
    };
    labApprovalsRepository.updatePolicy(next);
    return next;
  }

  deletePolicyForCaller(caller: User, policyId: string): void {
    if (!isPlatformApprovalsAdmin(caller)) {
      throw new LabApprovalsError('FORBIDDEN', 'Only admins can manage approval policies');
    }
    if (!labApprovalsRepository.getPolicyById(policyId)) {
      throw new LabApprovalsError('NOT_FOUND', 'Policy not found');
    }
    labApprovalsRepository.deletePolicy(policyId);
  }

  async createRequestForCaller(
    caller: User,
    body: unknown,
    io?: SocketIOServer,
  ): Promise<LabApprovalRequestRecord> {
    if (caller.role === 'viewer') {
      throw new LabApprovalsError('FORBIDDEN', 'Viewers cannot submit approval requests');
    }
    const parsed = parseLabApprovalRequestCreate(body);
    const policy = labApprovalsRepository.getPolicyById(parsed.policyId);
    if (!policy || !policy.enabled) {
      throw new LabApprovalsError('NOT_FOUND', 'Policy not found or disabled');
    }
    if (policy.definition.steps.length === 0) {
      throw new LabApprovalsError('INVALID_INPUT', 'Policy has no steps');
    }

    labApprovalsRepository.insertRequest({
      id: parsed.id,
      policyId: parsed.policyId,
      title: parsed.title,
      description: parsed.description ?? null,
      status: 'pending',
      requesterUserId: caller.userId,
      subjectAppId: parsed.subjectAppId,
      subjectEntityType: parsed.subjectEntityType,
      subjectEntityId: parsed.subjectEntityId,
      currentStepIndex: 0,
    });

    for (let i = 0; i < policy.definition.steps.length; i++) {
      const step = policy.definition.steps[i];
      labApprovalsRepository.insertStep(parsed.id, i, step.assigneeUserId, i === 0 ? 'pending' : 'pending');
    }

    const request = labApprovalsRepository.getRequestById(parsed.id);
    if (!request) {
      throw new LabApprovalsError('INVALID_INPUT', 'Failed to create request');
    }

    await publishLabDomainEventPipeline(
      {
        schemaVersion: 1,
        id: randomUUID(),
        type: 'platform-approvals.request.created',
        sourceAppId: LAB_APPROVALS_SOURCE_APP_ID,
        occurredAt: new Date().toISOString(),
        actorUserId: caller.userId,
        payload: {
          requestId: request.id,
          policyId: request.policyId,
          title: request.title,
          subjectAppId: request.subjectAppId,
          subjectEntityType: request.subjectEntityType,
          subjectEntityId: request.subjectEntityId,
          currentStepIndex: 0,
          assigneeUserId: policy.definition.steps[0].assigneeUserId,
        },
      },
      caller.userId,
      io,
    );

    this.emitApprovalsInboxRefresh(io, [
      caller.userId,
      policy.definition.steps[0]?.assigneeUserId,
    ]);

    return request;
  }

  listInboxForCaller(caller: User): LabApprovalRequestRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    return labApprovalsRepository.listInboxForAssignee(caller.userId);
  }

  listMyRequestsForCaller(caller: User): LabApprovalRequestRecord[] {
    if (caller.role === 'viewer') {
      return [];
    }
    return labApprovalsRepository.listRequestsForRequester(caller.userId);
  }

  getRequestForCaller(caller: User, requestId: string): LabApprovalRequestRecord | null {
    const request = labApprovalsRepository.getRequestById(requestId);
    if (!request) {
      return null;
    }
    if (!this.canViewRequest(caller, request)) {
      throw new LabApprovalsError('FORBIDDEN', 'Cannot view this request');
    }
    return request;
  }

  async decideForCaller(
    caller: User,
    requestId: string,
    body: unknown,
    io?: SocketIOServer,
  ): Promise<LabApprovalRequestRecord> {
    if (caller.role === 'viewer') {
      throw new LabApprovalsError('FORBIDDEN', 'Viewers cannot decide approvals');
    }
    const parsed = parseLabApprovalDecision(body);
    const request = labApprovalsRepository.getRequestById(requestId);
    if (!request) {
      throw new LabApprovalsError('NOT_FOUND', 'Request not found');
    }
    if (request.status !== 'pending') {
      throw new LabApprovalsError('INVALID_INPUT', 'Request is not pending');
    }

    const currentStep = request.steps.find((s) => s.stepIndex === request.currentStepIndex);
    if (!currentStep || currentStep.status !== 'pending') {
      throw new LabApprovalsError('INVALID_INPUT', 'No pending step');
    }
    if (currentStep.assigneeUserId !== caller.userId && !isPlatformApprovalsAdmin(caller)) {
      throw new LabApprovalsError('FORBIDDEN', 'Not assignee for current step');
    }

    const stepStatus = parsed.decision === 'approve' ? 'approved' : 'rejected';
    labApprovalsRepository.updateStep(
      requestId,
      request.currentStepIndex,
      stepStatus,
      parsed.comment ?? null,
      caller.userId,
    );

    if (parsed.decision === 'reject') {
      labApprovalsRepository.updateRequestStatus(requestId, 'rejected');
      await this.emitRequestEvent('platform-approvals.request.rejected', request, caller.userId, io, {
        comment: parsed.comment,
      });
      const final = labApprovalsRepository.getRequestById(requestId)!;
      this.emitApprovalsInboxRefresh(io, [
        request.requesterUserId,
        currentStep.assigneeUserId,
        caller.userId,
      ]);
      return final;
    }

    await this.emitRequestEvent('platform-approvals.step.approved', request, caller.userId, io, {
      stepIndex: request.currentStepIndex,
    });

    const nextIndex = request.currentStepIndex + 1;
    if (nextIndex >= request.steps.length) {
      labApprovalsRepository.updateRequestStatus(requestId, 'approved');
      await this.emitRequestEvent('platform-approvals.request.approved', request, caller.userId, io, {});
      const final = labApprovalsRepository.getRequestById(requestId)!;
      this.emitApprovalsInboxRefresh(io, [request.requesterUserId, caller.userId]);
      return final;
    }

    labApprovalsRepository.updateRequestStepIndex(requestId, nextIndex);
    const updated = labApprovalsRepository.getRequestById(requestId)!;
    const nextAssignee = updated.steps[nextIndex]?.assigneeUserId;
    await publishLabDomainEventPipeline(
      {
        schemaVersion: 1,
        id: randomUUID(),
        type: 'platform-approvals.step.pending',
        sourceAppId: LAB_APPROVALS_SOURCE_APP_ID,
        occurredAt: new Date().toISOString(),
        actorUserId: caller.userId,
        payload: {
          requestId: updated.id,
          stepIndex: nextIndex,
          assigneeUserId: nextAssignee,
        },
      },
      caller.userId,
      io,
    );
    this.emitApprovalsInboxRefresh(io, [
      request.requesterUserId,
      caller.userId,
      nextAssignee,
    ]);
    return updated;
  }

  private emitApprovalsInboxRefresh(io: SocketIOServer | undefined, userIds: Array<number | undefined>): void {
    if (!io) {
      return;
    }
    const seen = new Set<number>();
    for (const raw of userIds) {
      const id = raw != null ? Number(raw) : NaN;
      if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
        continue;
      }
      seen.add(id);
      emitLabApprovalsInboxChanged(io, id);
    }
  }

  private canViewRequest(caller: User, request: LabApprovalRequestRecord): boolean {
    if (isPlatformApprovalsAdmin(caller)) {
      return true;
    }
    if (request.requesterUserId === caller.userId) {
      return true;
    }
    return request.steps.some((s) => s.assigneeUserId === caller.userId);
  }

  private async emitRequestEvent(
    type: string,
    request: LabApprovalRequestRecord,
    actorUserId: number,
    io?: SocketIOServer,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const requestStatus =
      type === 'platform-approvals.request.approved'
        ? 'approved'
        : type === 'platform-approvals.request.rejected'
          ? 'rejected'
          : undefined;
    await publishLabDomainEventPipeline(
      {
        schemaVersion: 1,
        id: randomUUID(),
        type,
        sourceAppId: LAB_APPROVALS_SOURCE_APP_ID,
        occurredAt: new Date().toISOString(),
        actorUserId,
        payload: {
          requestId: request.id,
          policyId: request.policyId,
          title: request.title,
          subjectAppId: request.subjectAppId,
          subjectEntityType: request.subjectEntityType,
          subjectEntityId: request.subjectEntityId,
          requesterUserId: request.requesterUserId,
          ...(requestStatus ? { requestStatus } : {}),
          ...extra,
        },
      },
      actorUserId,
      io,
    );
  }
}

export class LabApprovalsError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'LabApprovalsError';
  }
}

export const labApprovalsService = LabApprovalsService.getInstance();
