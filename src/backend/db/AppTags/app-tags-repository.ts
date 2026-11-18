import { Repository } from '../Repository';
import {
  AppTagsSQLStatementKeys,
  bootstrapAppTagsSchema,
  createAppTagsSQLStatements,
  type AppTagsSQLStatementKey,
} from './app-tags-schema';
import {
  PLATFORM_APP_TAG_SEEDS,
  SEEDED_APP_TAG_ASSIGNMENTS,
  type PlatformAppTagId,
} from '@/shared/config/platform-app-tag-catalog';

export interface PlatformAppTagRow {
  id: string;
  label: string;
  description: string;
  sort_order: number;
}

export interface AppTagUsage {
  appId: string;
  appName: string;
}

export class AppTagsRepository extends Repository {
  private statements: Partial<Record<AppTagsSQLStatementKey, import('better-sqlite3').Statement>> = {};

  close(): void {
    this.statements = {};
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    bootstrapAppTagsSchema(this.db);
    this.statements = createAppTagsSQLStatements(this.db);
    this.ensurePlatformTagCatalog();
    this.backfillAppAssignments();
  }

  private stmt(key: AppTagsSQLStatementKey) {
    const statement = this.statements[key];
    if (!statement) {
      throw new Error(`AppTags SQL statement not initialized: ${key}`);
    }
    return statement;
  }

  /** Inserts any catalog tags missing from SQLite (e.g. `learning` / `creative` after the catalog wave). */
  private ensurePlatformTagCatalog(): void {
    const insert = this.stmt(AppTagsSQLStatementKeys.tag_insert);
    for (const tag of PLATFORM_APP_TAG_SEEDS) {
      if (this.getTagById(tag.id)) {
        continue;
      }
      insert.run(tag.id, tag.label, tag.description, tag.sortOrder);
    }
  }

  private orderedTagsFromSeed(tagIds: Record<number, PlatformAppTagId>): PlatformAppTagId[] {
    return Object.entries(tagIds)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, tagId]) => tagId);
  }

  /**
   * Inserts missing seed rows; repairs apps that still only use seed tag ids but wrong order/positions
   * (legacy INSERT OR IGNORE could leave stale primary tags).
   */
  private backfillAppAssignments(): void {
    const insert = this.stmt(AppTagsSQLStatementKeys.assignment_insert);
    const appExists = this.stmt(AppTagsSQLStatementKeys.app_exists);

    for (const [appId, tagIds] of Object.entries(SEEDED_APP_TAG_ASSIGNMENTS) as Array<
      [string, Record<number, PlatformAppTagId>]
    >) {
      if (!appExists.get(appId)) {
        continue;
      }

      const expected = this.orderedTagsFromSeed(tagIds);
      const current = this.getAssignmentsForApp(appId);
      const expectedSet = new Set(expected);

      if (current.length === 0) {
        expected.forEach((tagId, position) => {
          insert.run(appId, tagId, position);
        });
        continue;
      }

      const primaryMismatch = current[0] !== expected[0];
      const onlySeedTags = current.every((id) => expectedSet.has(id as PlatformAppTagId));
      if (
        primaryMismatch ||
        (onlySeedTags && JSON.stringify(current) !== JSON.stringify(expected))
      ) {
        this.setAssignmentsForApp(appId, expected);
      }
    }
  }

  listTags(): PlatformAppTagRow[] {
    return this.stmt(AppTagsSQLStatementKeys.tags_all).all() as PlatformAppTagRow[];
  }

  getTagById(id: string): PlatformAppTagRow | undefined {
    return this.stmt(AppTagsSQLStatementKeys.tag_by_id).get(id) as PlatformAppTagRow | undefined;
  }

  createTag(input: { id: string; label: string; description?: string; sortOrder?: number }): void {
    const max = this.stmt(AppTagsSQLStatementKeys.tag_max_sort).get() as { m: number | null };
    const sortOrder = input.sortOrder ?? (max.m ?? 0) + 1;
    this.stmt(AppTagsSQLStatementKeys.tag_insert).run(
      input.id,
      input.label,
      input.description ?? '',
      sortOrder,
    );
  }

  updateTag(
    id: string,
    patch: { label?: string; description?: string; sortOrder?: number },
  ): void {
    const row = this.getTagById(id);
    if (!row) {
      throw new Error(`Unknown tag: ${id}`);
    }
    this.stmt(AppTagsSQLStatementKeys.tag_update).run(
      patch.label ?? row.label,
      patch.description ?? row.description,
      patch.sortOrder ?? row.sort_order,
      id,
    );
  }

  listAppsUsingTag(tagId: string): AppTagUsage[] {
    return this.stmt(AppTagsSQLStatementKeys.apps_using_tag).all(tagId) as AppTagUsage[];
  }

  deleteTag(tagId: string): { blocked: true; apps: AppTagUsage[] } | { blocked: false } {
    const apps = this.listAppsUsingTag(tagId);
    if (apps.length > 0) {
      return { blocked: true, apps };
    }
    this.stmt(AppTagsSQLStatementKeys.tag_delete).run(tagId);
    return { blocked: false };
  }

  getAssignmentsForApp(appId: string): PlatformAppTagId[] {
    const rows = this.stmt(AppTagsSQLStatementKeys.assignments_for_app).all(appId) as {
      tag_id: string;
    }[];
    return rows.map((r) => r.tag_id as PlatformAppTagId);
  }

  getAssignmentsForAllApps(): Map<string, string[]> {
    const rows = this.stmt(AppTagsSQLStatementKeys.assignments_all).all() as {
      app_id: string;
      tag_id: string;
      position: number;
    }[];
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.app_id) ?? [];
      list.push(row.tag_id);
      map.set(row.app_id, list);
    }
    return map;
  }

  setAssignmentsForApp(appId: string, orderedTagIds: string[]): void {
    if (orderedTagIds.length === 0) {
      throw new Error('At least one tag is required');
    }
    const known = new Set(this.listTags().map((t) => t.id));
    for (const id of orderedTagIds) {
      if (!known.has(id)) {
        throw new Error(`Unknown tag id: ${id}`);
      }
    }
    const txn = this.db.transaction(() => {
      this.stmt(AppTagsSQLStatementKeys.assignments_delete_for_app).run(appId);
      const ins = this.stmt(AppTagsSQLStatementKeys.assignment_insert);
      orderedTagIds.forEach((tagId, position) => {
        ins.run(appId, tagId, position);
      });
    });
    txn();
  }
}

export const appTagsRepository = new AppTagsRepository();
