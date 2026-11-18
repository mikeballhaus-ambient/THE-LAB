import { Repository } from '../Repository';
import {
  LabRulesSQLStatementKeys,
  bootstrapLabRulesSchema,
  createLabRulesSQLStatements,
  type LabRulesSQLStatementKey,
} from './lab-rules-schema';
import type { LabRuleDefinitionV1, LabRuleRecord, LabRuleScope } from '@/shared/types/lab-rule';
import { parseLabRuleDefinition } from '@/shared/types/schemas/lab-rule-schema';

type RuleDbRow = {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  owner_user_id: number | null;
  created_by_user_id: number;
  enabled: number;
  priority: number;
  definition_json: string;
  created_at: string;
  updated_at: string;
};

function mapRuleRow(row: RuleDbRow): LabRuleRecord {
  let definition: LabRuleDefinitionV1;
  try {
    definition = parseLabRuleDefinition(JSON.parse(row.definition_json));
  } catch {
    definition = {
      schemaVersion: 2,
      trigger: { eventTypes: [] },
    };
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    scope: row.scope as LabRuleScope,
    ownerUserId: row.owner_user_id,
    createdByUserId: row.created_by_user_id,
    enabled: row.enabled === 1,
    priority: row.priority,
    definition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class LabRulesRepository extends Repository {
  private statements: Partial<Record<LabRulesSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapLabRulesSchema(this.db);
    this.statements = createLabRulesSQLStatements(this.db);
  }

  private stmt(key: LabRulesSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`LabRules SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  listAll(): LabRuleRecord[] {
    const rows = this.stmt(LabRulesSQLStatementKeys.rules_all).all() as RuleDbRow[];
    return rows.map(mapRuleRow);
  }

  getById(id: string): LabRuleRecord | null {
    const row = this.stmt(LabRulesSQLStatementKeys.rule_by_id).get(id) as RuleDbRow | undefined;
    return row ? mapRuleRow(row) : null;
  }

  countEnabledGlobal(): number {
    const row = this.stmt(LabRulesSQLStatementKeys.count_enabled_global).get() as { c: number } | undefined;
    return row?.c ?? 0;
  }

  countEnabledForOwner(ownerUserId: number): number {
    const row = this.stmt(LabRulesSQLStatementKeys.count_enabled_for_owner).get(ownerUserId) as
      | { c: number }
      | undefined;
    return row?.c ?? 0;
  }

  insertRule(record: {
    id: string;
    name: string;
    description: string | null;
    scope: LabRuleScope;
    ownerUserId: number | null;
    createdByUserId: number;
    enabled: boolean;
    priority: number;
    definitionJson: string;
  }): void {
    this.stmt(LabRulesSQLStatementKeys.rule_insert).run(
      record.id,
      record.name,
      record.description,
      record.scope,
      record.ownerUserId,
      record.createdByUserId,
      record.enabled ? 1 : 0,
      record.priority,
      record.definitionJson,
    );
  }

  updateRule(record: LabRuleRecord): void {
    this.stmt(LabRulesSQLStatementKeys.rule_update).run(
      record.name,
      record.description ?? null,
      record.scope,
      record.ownerUserId,
      record.enabled ? 1 : 0,
      record.priority,
      JSON.stringify(record.definition),
      record.id,
    );
  }

  deleteRule(id: string): void {
    this.stmt(LabRulesSQLStatementKeys.rule_delete).run(id);
  }

  listEnabledRulesForEvaluation(actorUserId: number | null): LabRuleRecord[] {
    const rows = this.stmt(LabRulesSQLStatementKeys.enabled_rules_for_evaluation).all(
      actorUserId ?? -1,
    ) as RuleDbRow[];
    return rows.map(mapRuleRow);
  }

  clearAllRulesForTests(): void {
    if (!this.db) {
      return;
    }
    this.db.prepare('DELETE FROM lab_rule_executions').run();
    this.db.prepare('DELETE FROM lab_rules').run();
  }
}

export const labRulesRepository = new LabRulesRepository();
