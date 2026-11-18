import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import type {
  LabWorkflowWebhook,
  LabWorkflowWebhookMode,
} from '@/shared/types/lab-workflow-webhook';

type WebhookDbRow = {
  id: string;
  workflow_id: string;
  trigger_node_id: string;
  name: string;
  slug: string | null;
  test_token_hash: string | null;
  live_token_hash: string | null;
  test_secret_plain: string | null;
  live_secret_plain: string | null;
  hmac_secret: string | null;
  event_type: string;
  enabled: number;
  last_received_at: string | null;
  last_received_ms: number | null;
  mapping_source_json: string | null;
  mapping_source_fingerprint: string | null;
  mapping_source_captured_at: string | null;
  created_at: string;
  updated_at: string;
  /** Present only on the resolve query, where SQL computes it from which hash matched. */
  matched_mode?: string | null;
};

function mapRow(row: WebhookDbRow): LabWorkflowWebhook {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    triggerNodeId: row.trigger_node_id,
    name: row.name,
    slug: row.slug ?? '',
    testTokenHash: row.test_token_hash ?? '',
    liveTokenHash: row.live_token_hash ?? '',
    testSecret: row.test_secret_plain ?? '',
    liveSecret: row.live_secret_plain ?? '',
    hmacSecret: row.hmac_secret,
    eventType: row.event_type,
    enabled: row.enabled === 1,
    lastReceivedAt: row.last_received_at,
    mappingSourceJson: row.mapping_source_json,
    mappingSourceFingerprint: row.mapping_source_fingerprint,
    mappingSourceCapturedAt: row.mapping_source_captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InsertWebhookParams {
  id: string;
  workflowId: string;
  triggerNodeId: string;
  name: string;
  /** Readable URL segment. Not a credential. */
  slug: string;
  testTokenHash: string;
  liveTokenHash: string;
  /** The plaintext secrets, so the URL can be shown again later. Default `''` ⇒ not recoverable. */
  testSecret?: string;
  liveSecret?: string;
  hmacSecret?: string | null;
  eventType: string;
  enabled?: boolean;
}

/** Result of resolving an inbound call: the row plus which mode the matched secret belongs to. */
export interface ResolvedWebhook {
  webhook: LabWorkflowWebhook;
  mode: LabWorkflowWebhookMode;
}

/**
 * Inbound webhook credentials (W10a).
 *
 * The repository exposes the hash, never the token: there is no method that could return a plaintext
 * token, because none was ever stored.
 */
export class LabWorkflowWebhooksRepository extends Repository {
  private statements: Partial<Record<LabWorkflowsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabWorkflowsSchema(this.db);
    this.statements = createLabWorkflowsSQLStatements(this.db);
  }

  private stmt(key: LabWorkflowsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabWorkflows SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  /**
   * @deprecated phase 37 — use {@link resolveBySecret}.
   *
   * Matches the **live** hash so a pre-37 token keeps working in the mode it already ran in.
   */
  findByTokenHash(tokenHash: string): LabWorkflowWebhook | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.webhook_by_token_hash).get(tokenHash) as
      | WebhookDbRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  /**
   * Resolve an inbound call: which webhook, and **which mode**.
   *
   * The mode comes from the column that matched, not from the URL. That is the security property of
   * this phase: there is no `test`/`live` segment for a caller to edit, so a leaked test URL cannot be
   * turned into a live one.
   *
   * Returns only enabled hooks, so a disabled hook and an unknown secret are the same 401 — which
   * stops the endpoint being usable to probe whether a secret exists.
   */
  resolveBySecret(secretHash: string): ResolvedWebhook | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.webhook_by_secret_hash).get(
      secretHash,
      secretHash,
      secretHash,
    ) as WebhookDbRow | undefined;
    if (!row) {
      return null;
    }
    // The query computes it; anything unexpected is treated as test because that is the harmless mode.
    const mode: LabWorkflowWebhookMode = row.matched_mode === 'live' ? 'live' : 'test';
    return { webhook: mapRow(row), mode };
  }

  /** Whether a slug exists. Used only to reject, never to authorise. */
  slugExists(slug: string): boolean {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.webhook_by_slug).get(slug) as
      | { id: string }
      | undefined;
    return Boolean(row);
  }

  /**
   * Record the shape an output mapping was authored from.
   *
   * Persisted on the row rather than derived from captures: captures are pruned, and a mapping must
   * keep its provenance after the observation is gone.
   */
  setMappingSource(
    id: string,
    source: { payloadJson: string; fingerprint: string; capturedAt: string },
  ): void {
    this.stmt(LabWorkflowsSQLStatementKeys.webhook_set_mapping_source).run(
      source.payloadJson,
      source.fingerprint,
      source.capturedAt,
      id,
    );
  }

  listForWorkflow(workflowId: string): LabWorkflowWebhook[] {
    return (
      this.stmt(LabWorkflowsSQLStatementKeys.webhooks_for_workflow).all(workflowId) as WebhookDbRow[]
    ).map(mapRow);
  }

  findById(workflowId: string, id: string): LabWorkflowWebhook | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.webhook_by_id).get(id, workflowId) as
      | WebhookDbRow
      | undefined;
    return row ? mapRow(row) : null;
  }

  countForWorkflow(workflowId: string): number {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.webhook_count_for_workflow).get(workflowId) as {
      c: number;
    };
    return row.c;
  }

  insert(params: InsertWebhookParams): void {
    this.stmt(LabWorkflowsSQLStatementKeys.webhook_insert).run(
      params.id,
      params.workflowId,
      params.triggerNodeId,
      params.name,
      params.slug,
      params.testTokenHash,
      params.liveTokenHash,
      params.testSecret ?? '',
      params.liveSecret ?? '',
      params.hmacSecret ?? null,
      params.eventType,
      params.enabled === false ? 0 : 1,
    );
  }

  update(
    workflowId: string,
    id: string,
    params: { name: string; eventType: string; hmacSecret?: string | null; enabled: boolean },
  ): void {
    this.stmt(LabWorkflowsSQLStatementKeys.webhook_update).run(
      params.name,
      params.eventType,
      params.hmacSecret ?? null,
      params.enabled ? 1 : 0,
      id,
      workflowId,
    );
  }

  /**
   * Replace one mode's credential: the hash that authorises it and the plaintext that displays it.
   *
   * Both move together by necessity — the URL the panel shows is only correct if the hash stored
   * alongside it accepts that secret. Updating one alone would produce a URL that answers `401`.
   */
  setSecret(
    workflowId: string,
    id: string,
    mode: LabWorkflowWebhookMode,
    params: { tokenHash: string; secret: string },
  ): void {
    this.stmt(LabWorkflowsSQLStatementKeys.webhook_set_secret).run(
      mode,
      params.tokenHash,
      mode,
      params.secret,
      mode,
      params.tokenHash,
      mode,
      params.secret,
      id,
      workflowId,
    );
  }

  markReceived(id: string, atIso: string, atMs: number): void {
    this.stmt(LabWorkflowsSQLStatementKeys.webhook_mark_received).run(atIso, atMs, id);
  }

  delete(workflowId: string, id: string): void {
    this.stmt(LabWorkflowsSQLStatementKeys.webhook_delete).run(id, workflowId);
  }

  /**
   * The rate-limit input.
   *
   * Read separately from the row because `webhook_by_token_hash` returns the mapped record, which
   * deliberately does not carry `last_received_ms` — an implementation detail of the limiter, not
   * part of the webhook's public shape.
   */
  lastReceivedMs(id: string, workflowId: string): number | null {
    if (!this.db) {
      return null;
    }
    const row = this.db
      .prepare('SELECT last_received_ms FROM lab_workflow_webhooks WHERE id = ? AND workflow_id = ?')
      .get(id, workflowId) as { last_received_ms: number | null } | undefined;
    return row?.last_received_ms ?? null;
  }
}

// `new`, matching every other `Repository` subclass in this folder.
export const labWorkflowWebhooksRepository = new LabWorkflowWebhooksRepository();
