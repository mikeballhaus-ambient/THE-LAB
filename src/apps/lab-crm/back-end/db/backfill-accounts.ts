import type { Database } from 'better-sqlite3';

/**
 * One-time backfill: create `accounts` rows from the distinct `contacts.company` strings and
 * link each contact via `companyId`.
 *
 * Option A of the gold-source decision (see plans/rm-64-lab-app-integrations/
 * DEMO-DATA-SEED-PLAN.md §4): companies become first-class records so any app can point a
 * lookup at them, instead of re-typing the name on every row.
 *
 * Idempotent — re-running inserts nothing when every company already has an account.
 */

interface ContactRow {
  id: number;
  data_json: string;
}

function entityDefinitionId(db: Database, entityKey: string): number | null {
  const row = db
    .prepare('SELECT id FROM entity_definitions WHERE entity_key = ? LIMIT 1')
    .get(entityKey) as { id: number } | undefined;
  return row?.id ?? null;
}

function parseRecord(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Distinct, trimmed company names from contact records, in first-seen order. */
export function listContactCompanyNames(db: Database): string[] {
  const contactsDefId = entityDefinitionId(db, 'contacts');
  if (contactsDefId == null) {
    return [];
  }

  const rows = db
    .prepare('SELECT id, data_json FROM entity_records WHERE entity_definition_id = ? ORDER BY id')
    .all(contactsDefId) as ContactRow[];

  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of rows) {
    const company = parseRecord(row.data_json).company;
    if (typeof company !== 'string') {
      continue;
    }
    const name = company.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    names.push(name);
  }
  return names;
}

/** Create an account record for a company name; returns the new record id. */
function insertAccount(db: Database, accountsDefId: number, name: string): number {
  const result = db
    .prepare(
      `INSERT INTO entity_records (entity_definition_id, data_json, created_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
    )
    .run(accountsDefId, JSON.stringify({ name, status: 'active' }));
  return Number(result.lastInsertRowid);
}

function findAccountIdByName(
  db: Database,
  accountsDefId: number,
  name: string,
): number | null {
  const rows = db
    .prepare('SELECT id, data_json FROM entity_records WHERE entity_definition_id = ?')
    .all(accountsDefId) as ContactRow[];
  for (const row of rows) {
    const recordName = parseRecord(row.data_json).name;
    if (typeof recordName === 'string' && recordName.trim() === name) {
      return row.id;
    }
  }
  return null;
}

/**
 * Ensure every distinct contact company has an account record and that contacts carry
 * `companyId`. Returns counts for logging/tests.
 */
export function backfillAccountsFromContactCompanies(db: Database): {
  accountsCreated: number;
  contactsLinked: number;
} {
  const accountsDefId = entityDefinitionId(db, 'accounts');
  const contactsDefId = entityDefinitionId(db, 'contacts');
  if (accountsDefId == null || contactsDefId == null) {
    return { accountsCreated: 0, contactsLinked: 0 };
  }

  const companyNames = listContactCompanyNames(db);
  const accountIdByCompany = new Map<string, number>();
  let accountsCreated = 0;

  for (const name of companyNames) {
    const existing = findAccountIdByName(db, accountsDefId, name);
    if (existing != null) {
      accountIdByCompany.set(name, existing);
      continue;
    }
    accountIdByCompany.set(name, insertAccount(db, accountsDefId, name));
    accountsCreated += 1;
  }

  const contacts = db
    .prepare('SELECT id, data_json FROM entity_records WHERE entity_definition_id = ?')
    .all(contactsDefId) as ContactRow[];

  const update = db.prepare(
    `UPDATE entity_records SET data_json = ?, updated_at = datetime('now') WHERE id = ?`,
  );

  let contactsLinked = 0;
  for (const contact of contacts) {
    const record = parseRecord(contact.data_json);
    if (record.companyId != null) {
      continue;
    }
    const company = typeof record.company === 'string' ? record.company.trim() : '';
    const accountId = company ? accountIdByCompany.get(company) : undefined;
    if (accountId == null) {
      continue;
    }
    update.run(JSON.stringify({ ...record, companyId: accountId }), contact.id);
    contactsLinked += 1;
  }

  return { accountsCreated, contactsLinked };
}
