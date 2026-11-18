import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import type { User } from '@/shared/types/user';
import { requirePlatformHttpUser } from '../middleware/platform-http-auth';
import { labRulesService } from '../db/LabRules/lab-rules-service';
import { labWorkflowsService } from '../db/LabWorkflows/lab-workflows-service';
import { labApprovalsService } from '../db/LabApprovals/lab-approvals-service';
import { labLedgerService } from '../db/LabLedger/lab-ledger-service';
import { appTagsService } from '../db/AppTags/app-tags-service';
import {
  parseLabRuleDefinition,
  parseLabRuleUpdate,
} from '@/shared/types/schemas/lab-rule-schema';
import { parseLabWorkflowDefinition } from '@/shared/types/schemas/lab-workflow-schema';
import {
  parseLabApprovalDecision,
  parseLabApprovalRequestCreate,
} from '@/shared/types/schemas/lab-approval-schema';
import { parsePolicyDefinitionFromConnectorBody } from '@/shared/lab-integrations/platform-approvals-policy-connector';
import {
  parseLabLedgerAccountCreate,
  parseLabLedgerAccountUpdate,
} from '@/shared/types/schemas/lab-ledger-schema';
import type { LabRuleRecord } from '@/shared/types/lab-rule';
import type { LabWorkflowRecord } from '@/shared/types/lab-workflow';
import type { LabApprovalPolicyRecord, LabApprovalRequestRecord } from '@/shared/types/lab-approval';
import type { LabLedgerAccountRecord, LabLedgerEntryRecord } from '@/shared/types/lab-ledger';
import { parseLabLedgerEntryCreate } from '@/shared/types/schemas/lab-ledger-schema';
import type { PlatformAppTag } from '@/shared/types/platform-app-tags';
declare module 'fastify' {
  interface FastifyInstance {
    io?: SocketIOServer;
  }

  interface FastifyRequest {
    labUser?: User;
  }
}

import {
  PLATFORM_CONNECTOR_SEGMENT_CATALOG_APP_TAGS,
  PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_POLICIES,
  PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_REQUESTS,
  PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ACCOUNTS,
  PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ENTRIES,
  PLATFORM_CONNECTOR_SEGMENT_LAB_RULES,
  PLATFORM_CONNECTOR_SEGMENT_LAB_WORKFLOWS,
} from '@/shared/lab-integrations/platform-catalog-integration-services';

function callerFromRequest(request: FastifyRequest): User | null {
  return request.labUser ?? null;
}

function parseJsonField(raw: unknown, label: string): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new Error(`Invalid ${label} JSON`);
    }
  }
  return raw;
}

function ruleToConnector(rule: LabRuleRecord) {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? '',
    scope: rule.scope,
    enabled: rule.enabled,
    priority: rule.priority,
    definitionJson: JSON.stringify(rule.definition, null, 2),
  };
}

function workflowToConnector(workflow: LabWorkflowRecord) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? '',
    scope: workflow.scope,
    enabled: workflow.enabled,
    priority: workflow.priority,
    definitionJson: JSON.stringify(workflow.definition, null, 2),
  };
}

function policyToConnector(policy: LabApprovalPolicyRecord) {
  const steps = policy.definition.steps;
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description ?? '',
    enabled: policy.enabled,
    step1AssigneeUserId: steps[0]?.assigneeUserId,
    step1Label: steps[0]?.label ?? '',
    step2AssigneeUserId: steps[1]?.assigneeUserId,
    step2Label: steps[1]?.label ?? '',
    definitionJson: JSON.stringify(policy.definition),
  };
}

function requestToConnector(request: LabApprovalRequestRecord) {
  return {
    id: request.id,
    policyId: request.policyId,
    title: request.title,
    description: request.description ?? '',
    subjectAppId: request.subjectAppId,
    subjectEntityType: request.subjectEntityType,
    subjectEntityId: request.subjectEntityId,
    notifyAssignees: true,
    decision: '',
    comment: '',
  };
}

function ledgerAccountChartLabel(
  accountId: string,
  accountsById: Map<string, LabLedgerAccountRecord>,
): string {
  const account = accountsById.get(accountId);
  if (!account) {
    return accountId;
  }
  return `${account.code} — ${account.name}`;
}

function entryToConnector(
  entry: LabLedgerEntryRecord,
  accountsById: Map<string, LabLedgerAccountRecord>,
) {
  const debit = entry.lines.find((line) => line.side === 'debit');
  const credit = entry.lines.find((line) => line.side === 'credit');
  const amountCents = debit?.amountCents ?? credit?.amountCents ?? 0;
  const debitAccountId = debit?.accountId ?? '';
  const creditAccountId = credit?.accountId ?? '';
  return {
    id: entry.id,
    memo: entry.memo ?? '',
    debitAccountId,
    creditAccountId,
    debitAccountLabel: ledgerAccountChartLabel(debitAccountId, accountsById),
    creditAccountLabel: ledgerAccountChartLabel(creditAccountId, accountsById),
    amountDollars: amountCents / 100,
  };
}

function ledgerAccountsByIdForCaller(caller: User): Map<string, LabLedgerAccountRecord> {
  const accounts = labLedgerService.listAccountsForCaller(caller);
  return new Map(accounts.map((account) => [account.id, account]));
}

function accountToConnector(account: LabLedgerAccountRecord) {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
    normalBalance: account.normalBalance,
    balanceDollars: account.balanceCents / 100,
    enabled: account.enabled,
  };
}

function tagToConnector(tag: PlatformAppTag) {
  return {
    id: tag.id,
    label: tag.label,
    description: tag.description ?? '',
    sortOrder: tag.sortOrder,
  };
}

function mapPlatformError(reply: FastifyReply, err: unknown) {
  const message = err instanceof Error ? err.message : 'Request failed';
  return reply.status(400).send({ error: 'Bad Request', message });
}

function registerLabRulesConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_LAB_RULES}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const rules = labRulesService.listForCaller(caller);
    return reply.send(rules.map(ruleToConnector));
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    const rule = labRulesService.getForCaller(caller, id);
    if (!rule) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    return reply.send(ruleToConnector(rule));
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (!body.id) {
        body.id = randomUUID();
      }
      body.definition = parseLabRuleDefinition(parseJsonField(body.definitionJson, 'definition'));
      delete body.definitionJson;
      const rule = labRulesService.createForCaller(caller, body);
      return reply.send(ruleToConnector(rule));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (body.definitionJson != null) {
        body.definition = parseLabRuleDefinition(parseJsonField(body.definitionJson, 'definition'));
        delete body.definitionJson;
      }
      parseLabRuleUpdate(body);
      const rule = labRulesService.updateForCaller(caller, id, body);
      return reply.send(ruleToConnector(rule));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.delete(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      labRulesService.deleteForCaller(caller, id);
      return reply.send({ success: true });
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
}

function registerLabWorkflowsConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_LAB_WORKFLOWS}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const rows = labWorkflowsService.listForCaller(caller);
    return reply.send(rows.map(workflowToConnector));
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    const row = labWorkflowsService.getForCaller(caller, id);
    if (!row) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    return reply.send(workflowToConnector(row));
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (!body.id) {
        body.id = randomUUID();
      }
      body.definition = parseLabWorkflowDefinition(parseJsonField(body.definitionJson, 'definition'));
      delete body.definitionJson;
      const row = labWorkflowsService.createForCaller(caller, body);
      return reply.send(workflowToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (body.definitionJson != null) {
        body.definition = parseLabWorkflowDefinition(parseJsonField(body.definitionJson, 'definition'));
        delete body.definitionJson;
      }
      const row = labWorkflowsService.updateForCaller(caller, id, body);
      return reply.send(workflowToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.delete(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      labWorkflowsService.deleteForCaller(caller, id);
      return reply.send({ success: true });
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
}

function registerLabApprovalPoliciesConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_POLICIES}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    return reply.send(labApprovalsService.listPoliciesForCaller(caller).map(policyToConnector));
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    const row = labApprovalsService.listPoliciesForCaller(caller).find((p) => p.id === id);
    if (!row) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    return reply.send(policyToConnector(row));
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (!body.id) {
        body.id = randomUUID();
      }
      body.definition = parsePolicyDefinitionFromConnectorBody(body, parseJsonField);
      delete body.definitionJson;
      delete body.step1AssigneeUserId;
      delete body.step1Label;
      delete body.step2AssigneeUserId;
      delete body.step2Label;
      const row = labApprovalsService.createPolicyForCaller(caller, body);
      return reply.send(policyToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (
        body.definitionJson != null
        || body.step1AssigneeUserId != null
        || body.step2AssigneeUserId != null
      ) {
        body.definition = parsePolicyDefinitionFromConnectorBody(body, parseJsonField);
        delete body.definitionJson;
        delete body.step1AssigneeUserId;
        delete body.step1Label;
        delete body.step2AssigneeUserId;
        delete body.step2Label;
      }
      const row = labApprovalsService.updatePolicyForCaller(caller, id, body);
      return reply.send(policyToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.delete(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      labApprovalsService.deletePolicyForCaller(caller, id);
      return reply.send({ success: true });
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
}

function registerLabApprovalRequestsConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_LAB_APPROVAL_REQUESTS}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const inbox = labApprovalsService.listInboxForCaller(caller);
    const mine = labApprovalsService.listMyRequestsForCaller(caller);
    const byId = new Map<string, LabApprovalRequestRecord>();
    for (const row of [...inbox, ...mine]) {
      byId.set(row.id, row);
    }
    return reply.send([...byId.values()].map(requestToConnector));
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const row = labApprovalsService.getRequestForCaller(caller, id);
      if (!row) {
        return reply.status(404).send({ error: 'Not Found' });
      }
      return reply.send(requestToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (!body.id) {
        body.id = randomUUID();
      }
      if (!body.subjectEntityId || String(body.subjectEntityId).trim() === '') {
        body.subjectEntityId = randomUUID();
      }
      parseLabApprovalRequestCreate(body);
      const row = await labApprovalsService.createRequestForCaller(caller, body, server.io);
      return reply.send(requestToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (body.decision == null || String(body.decision).trim() === '') {
        return reply.status(400).send({ error: 'Bad Request', message: 'decision is required' });
      }
      parseLabApprovalDecision({
        decision: body.decision,
        comment: body.comment,
      });
      const row = await labApprovalsService.decideForCaller(caller, id, body, server.io);
      return reply.send(requestToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
}

function registerLabLedgerAccountsConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ACCOUNTS}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    return reply.send(labLedgerService.listAccountsForCaller(caller).map(accountToConnector));
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    const row = labLedgerService.listAccountsForCaller(caller).find((a) => a.id === id);
    if (!row) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    return reply.send(accountToConnector(row));
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (!body.id) {
        body.id = randomUUID();
      }
      parseLabLedgerAccountCreate(body);
      const row = labLedgerService.createAccountForCaller(caller, body);
      return reply.send(accountToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      parseLabLedgerAccountUpdate(body);
      const row = labLedgerService.updateAccountForCaller(caller, id, body);
      return reply.send(accountToConnector(row));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.delete(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    try {
      labLedgerService.deleteAccountForCaller(caller, id);
      return reply.send({ success: true });
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
}

function registerLabLedgerEntriesConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_LAB_LEDGER_ENTRIES}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const accountsById = ledgerAccountsByIdForCaller(caller);
    return reply.send(
      labLedgerService
        .listRecentEntriesForCaller(caller)
        .map((entry) => entryToConnector(entry, accountsById)),
    );
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    const row = labLedgerService
      .listRecentEntriesForCaller(caller)
      .find((entry) => entry.id === id);
    if (!row) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    const accountsById = ledgerAccountsByIdForCaller(caller);
    return reply.send(entryToConnector(row, accountsById));
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const body = { ...(request.body as Record<string, unknown>) };
      if (!body.id) {
        body.id = randomUUID();
      }
      const cents = Math.round(Number(body.amountDollars) * 100);
      if (!Number.isFinite(cents) || cents <= 0) {
        throw new Error('amountDollars must be greater than zero');
      }
      const debitAccountId = String(body.debitAccountId ?? '').trim();
      const creditAccountId = String(body.creditAccountId ?? '').trim();
      if (!debitAccountId || !creditAccountId) {
        throw new Error('debitAccountId and creditAccountId are required');
      }
      if (debitAccountId === creditAccountId) {
        throw new Error('Debit and credit accounts must differ');
      }
      const entryBody = {
        id: body.id,
        memo: body.memo,
        lines: [
          { accountId: debitAccountId, side: 'debit', amountCents: cents },
          { accountId: creditAccountId, side: 'credit', amountCents: cents },
        ],
      };
      parseLabLedgerEntryCreate(entryBody);
      const row = await labLedgerService.postEntryForCaller(caller, entryBody, server.io);
      const accountsById = ledgerAccountsByIdForCaller(caller);
      return reply.send(entryToConnector(row, accountsById));
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
}

function registerCatalogAppTagsConnector(server: FastifyInstance): void {
  const prefix = `/api/connector/${PLATFORM_CONNECTOR_SEGMENT_CATALOG_APP_TAGS}`;
  server.get(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const tags = appTagsService.listTags().map((row) =>
      tagToConnector({
        id: row.id,
        label: row.label,
        description: row.description,
        sortOrder: row.sort_order,
      }),
    );
    return reply.send(tags);
  });
  server.get(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const id = (request.params as { id: string }).id;
    const row = appTagsService.listTags().find((t) => t.id === id);
    if (!row) {
      return reply.status(404).send({ error: 'Not Found' });
    }
    return reply.send(
      tagToConnector({
        id: row.id,
        label: row.label,
        description: row.description,
        sortOrder: row.sort_order,
      }),
    );
  });
  server.post(prefix, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    if (caller.role !== 'owner' && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'FORBIDDEN' });
    }
    try {
      const body = request.body as {
        id?: string;
        label?: string;
        description?: string;
        sortOrder?: number;
      };
      appTagsService.createTag({
        id: String(body.id ?? ''),
        label: String(body.label ?? ''),
        description: body.description,
        sortOrder: body.sortOrder,
      });
      const row = appTagsService.listTags().find((t) => t.id === body.id);
      if (!row) {
        return reply.status(500).send({ error: 'Create failed' });
      }
      return reply.send(
        tagToConnector({
          id: row.id,
          label: row.label,
          description: row.description,
          sortOrder: row.sort_order,
        }),
      );
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.post(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    if (caller.role !== 'owner' && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'FORBIDDEN' });
    }
    const id = (request.params as { id: string }).id;
    try {
      const body = request.body as {
        label?: string;
        description?: string;
        sortOrder?: number;
      };
      appTagsService.updateTag(id, body);
      const row = appTagsService.listTags().find((t) => t.id === id);
      if (!row) {
        return reply.status(404).send({ error: 'Not Found' });
      }
      return reply.send(
        tagToConnector({
          id: row.id,
          label: row.label,
          description: row.description,
          sortOrder: row.sort_order,
        }),
      );
    } catch (err) {
      return mapPlatformError(reply, err);
    }
  });
  server.delete(`${prefix}/:id`, async (request, reply) => {
    const caller = callerFromRequest(request);
    if (!caller) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    if (caller.role !== 'owner' && caller.role !== 'admin') {
      return reply.status(403).send({ error: 'FORBIDDEN' });
    }
    const id = (request.params as { id: string }).id;
    const result = appTagsService.deleteTag(id);
    if (!result.success) {
      return reply.status(409).send({ error: 'TAG_IN_USE' });
    }
    return reply.send({ success: true });
  });
}

export function registerPlatformIntegrationConnectorRoutes(server: FastifyInstance): void {
  server.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0] ?? '';
    if (!path.startsWith('/api/connector/lab-') && !path.startsWith('/api/connector/catalog-app-tags')) {
      return;
    }
    await requirePlatformHttpUser(request, reply);
  });

  registerLabRulesConnector(server);
  registerLabWorkflowsConnector(server);
  registerLabApprovalPoliciesConnector(server);
  registerLabApprovalRequestsConnector(server);
  registerLabLedgerAccountsConnector(server);
  registerLabLedgerEntriesConnector(server);
  registerCatalogAppTagsConnector(server);
}
