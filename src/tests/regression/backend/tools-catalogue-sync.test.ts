import { describe, expect, test } from '@jest/globals';
import Database from 'better-sqlite3';
import { ToolsRepository } from '@/backend/db/Tools/tools-repository';

/**
 * The persona editor lists `tools` table rows — not the live MCP registry. A tool that is registered
 * but never catalogued is therefore unassignable: it exists, an agent could run it, and Settings →
 * Personas → Tools shows nothing. This was the Workflow Studio and Knowledge Base blind spot.
 */

async function freshRepository(): Promise<{
  repository: ToolsRepository;
  db: Database.Database;
}> {
  const db = new Database(':memory:');
  const repository = new ToolsRepository();
  await repository.bootstrap(db);
  return { repository, db };
}

describe('tools catalogue reconciliation', () => {
  test('seedTools alone omits registered-but-unseeded servers', async () => {
    const { repository, db } = await freshRepository();
    const ids = repository.getAllTools().map((tool) => tool.id);

    // Regression guard: these are exactly the ids that were missing. If someone adds them to
    // `seedTools` this assertion becomes stale and should be replaced by an equivalence check.
    expect(ids).not.toContain('lab_workflow_list_node_types');
    expect(ids).not.toContain('lab_kb_search');
    db.close();
  });

  test('upsertTools adds tools that the seed never listed', async () => {
    const { repository, db } = await freshRepository();

    const written = repository.upsertTools([
      { id: 'lab_workflow_list_node_types', name: 'Workflow Studio - List Node Types', description: 'x' },
      { id: 'lab_kb_search', name: 'Knowledge Base - Search', description: 'y' },
    ]);

    expect(written).toBe(2);
    const ids = repository.getAllTools().map((tool) => tool.id);
    expect(ids).toContain('lab_workflow_list_node_types');
    expect(ids).toContain('lab_kb_search');
    db.close();
  });

  test('upsertTools is idempotent and refreshes name/description', async () => {
    const { repository, db } = await freshRepository();

    repository.upsertTools([{ id: 'lab_kb_search', name: 'Old', description: 'old' }]);
    repository.upsertTools([{ id: 'lab_kb_search', name: 'Knowledge Base - Search', description: 'new' }]);

    const rows = repository.getAllTools().filter((tool) => tool.id === 'lab_kb_search');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Knowledge Base - Search');
    expect(rows[0].description).toBe('new');
    db.close();
  });

  test('upsertTools skips malformed rows without dropping valid ones', async () => {
    const { repository, db } = await freshRepository();

    const written = repository.upsertTools([
      { id: '', name: 'no id', description: 'x' },
      { id: 'lab_kb_get', name: 'Knowledge Base - Get Article', description: 'y' },
    ]);

    expect(written).toBe(1);
    expect(repository.getAllTools().map((tool) => tool.id)).toContain('lab_kb_get');
    db.close();
  });

  test('upserting a seeded tool does not duplicate it', async () => {
    const { repository, db } = await freshRepository();
    const before = repository.getAllTools().length;

    repository.upsertTools([
      { id: 'read_file', name: 'Read File', description: 'Reads text-based files from the filesystem.' },
    ]);

    expect(repository.getAllTools()).toHaveLength(before);
    db.close();
  });
});
