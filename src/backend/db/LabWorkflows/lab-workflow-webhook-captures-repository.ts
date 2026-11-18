import { Repository } from '../Repository';
import {
  LabWorkflowsSQLStatementKeys,
  bootstrapLabWorkflowsSchema,
  createLabWorkflowsSQLStatements,
  type LabWorkflowsSQLStatementKey,
} from './lab-workflows-schema';
import {
  LAB_WORKFLOW_WEBHOOK_CAPTURE_LIMIT,
  type LabWorkflowWebhookCapture,
  type LabWorkflowWebhookMode,
} from '@/shared/types/lab-workflow-webhook';

type CaptureDbRow = {
  id: string;
  webhook_id: string;
  mode: string;
  payload_json: string;
  shape_fingerprint: string;
  received_at: string;
};

function mapRow(row: CaptureDbRow): LabWorkflowWebhookCapture {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    mode: row.mode === 'live' ? 'live' : 'test',
    payloadJson: row.payload_json,
    shapeFingerprint: row.shape_fingerprint,
    receivedAt: row.received_at,
  };
}

/**
 * Observed webhook bodies (phase 37).
 *
 * The purpose is discovery: an author arms the **test** endpoint, a caller posts, and the captured
 * body becomes the list of paths their output mapping can offer. There is no way to know a webhook's
 * payload shape ahead of time — the caller decides it — so it has to be observed at least once.
 *
 * Deliberately not the mock-sample table. A mock sample is a *shape you replay*; a capture is a
 * *shape that happened*. Merging them would let a live production call silently become a test fixture.
 *
 * Growth is bounded by pruning to the newest N per webhook; this is a short-memory aid, not an audit
 * log.
 */
export class LabWorkflowWebhookCapturesRepository extends Repository {
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

  /** Record one observation and prune the oldest beyond the cap. */
  record(params: {
    id: string;
    webhookId: string;
    mode: LabWorkflowWebhookMode;
    payloadJson: string;
    shapeFingerprint: string;
    receivedAt: string;
  }): void {
    this.stmt(LabWorkflowsSQLStatementKeys.capture_insert).run(
      params.id,
      params.webhookId,
      params.mode,
      params.payloadJson,
      params.shapeFingerprint,
      params.receivedAt,
    );
    this.stmt(LabWorkflowsSQLStatementKeys.capture_prune).run(
      params.webhookId,
      params.webhookId,
      LAB_WORKFLOW_WEBHOOK_CAPTURE_LIMIT,
    );
  }

  listRecent(webhookId: string, limit = LAB_WORKFLOW_WEBHOOK_CAPTURE_LIMIT): LabWorkflowWebhookCapture[] {
    return (
      this.stmt(LabWorkflowsSQLStatementKeys.captures_recent_for_webhook).all(
        webhookId,
        limit,
      ) as CaptureDbRow[]
    ).map(mapRow);
  }

  /**
   * The newest capture for a mode — what the mapping panel offers as suggestions.
   *
   * Mode-scoped because a test call and a live call can legitimately differ (a caller adding a debug
   * field in production is a real case worth seeing rather than blending).
   */
  latestForMode(webhookId: string, mode: LabWorkflowWebhookMode): LabWorkflowWebhookCapture | null {
    const row = this.stmt(LabWorkflowsSQLStatementKeys.capture_latest_for_mode).get(
      webhookId,
      mode,
    ) as CaptureDbRow | undefined;
    return row ? mapRow(row) : null;
  }
}

// `new`, matching every other `Repository` subclass in this folder.
export const labWorkflowWebhookCapturesRepository = new LabWorkflowWebhookCapturesRepository();
