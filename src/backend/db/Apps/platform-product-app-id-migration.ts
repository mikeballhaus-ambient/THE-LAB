import type { Database } from 'better-sqlite3';
import {
  LEGACY_PLATFORM_PRODUCT_APP_FOLDER_MAP,
  LEGACY_PLATFORM_PRODUCT_APP_ID_MAP,
} from '@/shared/config/platform-lab-product-app-ids';

function replaceAppIdStrings(text: string): string {
  let out = text;
  for (const [oldId, newId] of Object.entries(LEGACY_PLATFORM_PRODUCT_APP_ID_MAP)) {
    out = out.split(oldId).join(newId);
  }
  for (const [oldFolder, newFolder] of Object.entries(LEGACY_PLATFORM_PRODUCT_APP_FOLDER_MAP)) {
    out = out.split(`/src/apps/${oldFolder}/`).join(`/src/apps/${newFolder}/`);
    out = out.split(`@/apps/${oldFolder}/`).join(`@/apps/${newFolder}/`);
  }
  return out;
}

function tableExists(db: Database, name: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`)
    .get(name);
  return Boolean(row);
}

function repointAppTagAssignments(db: Database, oldId: string, newId: string): void {
  if (!tableExists(db, 'app_tag_assignments')) {
    return;
  }
  const rows = db
    .prepare(`SELECT tag_id, position FROM app_tag_assignments WHERE app_id = ?`)
    .all(oldId) as Array<{ tag_id: string; position: number }>;
  for (const row of rows) {
    const duplicateOnNew = db
      .prepare(`SELECT 1 FROM app_tag_assignments WHERE app_id = ? AND tag_id = ? LIMIT 1`)
      .get(newId, row.tag_id);
    if (duplicateOnNew) {
      db.prepare(`DELETE FROM app_tag_assignments WHERE app_id = ? AND tag_id = ? AND position = ?`).run(
        oldId,
        row.tag_id,
        row.position,
      );
    } else {
      db.prepare(
        `UPDATE app_tag_assignments SET app_id = ? WHERE app_id = ? AND tag_id = ? AND position = ?`,
      ).run(newId, oldId, row.tag_id, row.position);
    }
  }
}

function migrateUserAppPermissionsForPair(db: Database, oldId: string, newId: string): void {
  if (!tableExists(db, 'user_app_permissions')) {
    return;
  }
  const rows = db.prepare(`SELECT userid FROM user_app_permissions WHERE appId = ?`).all(oldId) as Array<{
    userid: number;
  }>;
  for (const row of rows) {
    const hasNew = db
      .prepare(`SELECT 1 FROM user_app_permissions WHERE userid = ? AND appId = ? LIMIT 1`)
      .get(row.userid, newId);
    if (hasNew) {
      db.prepare(`DELETE FROM user_app_permissions WHERE userid = ? AND appId = ?`).run(row.userid, oldId);
    } else {
      db.prepare(`UPDATE user_app_permissions SET appId = ? WHERE userid = ? AND appId = ?`).run(
        newId,
        row.userid,
        oldId,
      );
    }
  }
}

function migrateUserAppDomainRolesForPair(db: Database, oldId: string, newId: string): void {
  if (!tableExists(db, 'user_app_domain_roles')) {
    return;
  }
  const rows = db.prepare(`SELECT userid, role_key FROM user_app_domain_roles WHERE appId = ?`).all(oldId) as Array<{
    userid: number;
    role_key: string;
  }>;
  for (const row of rows) {
    const hasNew = db
      .prepare(`SELECT 1 FROM user_app_domain_roles WHERE userid = ? AND appId = ? AND role_key = ? LIMIT 1`)
      .get(row.userid, newId, row.role_key);
    if (hasNew) {
      db.prepare(`DELETE FROM user_app_domain_roles WHERE userid = ? AND appId = ? AND role_key = ?`).run(
        row.userid,
        oldId,
        row.role_key,
      );
    } else {
      db.prepare(
        `UPDATE user_app_domain_roles SET appId = ? WHERE userid = ? AND appId = ? AND role_key = ?`,
      ).run(newId, row.userid, oldId, row.role_key);
    }
  }
}

/** Clone-or-merge apps row so `app_tag_assignments` FK stays valid. */
function migrateAppsRow(db: Database, oldId: string, newId: string): void {
  const oldRow = db.prepare(`SELECT id FROM apps WHERE id = ?`).get(oldId) as { id: string } | undefined;
  if (!oldRow) {
    return;
  }
  const newExists = db.prepare(`SELECT id FROM apps WHERE id = ?`).get(newId);
  if (newExists) {
    repointAppTagAssignments(db, oldId, newId);
    db.prepare(`DELETE FROM apps WHERE id = ?`).run(oldId);
    return;
  }
  db.prepare(
    `INSERT INTO apps (
      id, name, description, fa_icon, order_num, type, component_path, server_config, metadata,
      app_system_instructions, is_enabled, is_server_side_enabled, dependencies, optional_dependencies,
      requires_port, version, changelog, latest_version, is_update_available, is_system, created_at, updated_at,
      integration_manifest
    )
    SELECT
      ?, name, description, fa_icon, order_num, type, component_path, server_config, metadata,
      app_system_instructions, is_enabled, is_server_side_enabled, dependencies, optional_dependencies,
      requires_port, version, changelog, latest_version, is_update_available, is_system, created_at, updated_at,
      integration_manifest
    FROM apps WHERE id = ?`,
  ).run(newId, oldId);
  repointAppTagAssignments(db, oldId, newId);
  db.prepare(`DELETE FROM apps WHERE id = ?`).run(oldId);
}

function migrateJsonColumnsOnApps(db: Database): void {
  const rows = db.prepare(`SELECT id, dependencies, optional_dependencies, server_config, component_path, integration_manifest FROM apps`).all() as Array<{
    id: string;
    dependencies: string | null;
    optional_dependencies: string | null;
    server_config: string | null;
    component_path: string | null;
    integration_manifest: string | null;
  }>;
  const update = db.prepare(
    `UPDATE apps SET dependencies = ?, optional_dependencies = ?, server_config = ?, component_path = ?, integration_manifest = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  );
  for (const row of rows) {
    const nextDeps = replaceAppIdStrings(row.dependencies ?? '[]');
    const nextOpt = replaceAppIdStrings(row.optional_dependencies ?? '[]');
    const nextServer = replaceAppIdStrings(row.server_config ?? '{}');
    const nextPath = replaceAppIdStrings(row.component_path ?? '');
    const nextManifest = replaceAppIdStrings(row.integration_manifest ?? '');
    if (
      nextDeps !== (row.dependencies ?? '[]') ||
      nextOpt !== (row.optional_dependencies ?? '[]') ||
      nextServer !== (row.server_config ?? '{}') ||
      nextPath !== (row.component_path ?? '') ||
      nextManifest !== (row.integration_manifest ?? '')
    ) {
      update.run(nextDeps, nextOpt, nextServer, nextPath || null, nextManifest || null, row.id);
    }
  }
}

function migrateIntegrationBindingHosts(db: Database): void {
  for (const [oldHost, newHost] of Object.entries(LEGACY_PLATFORM_PRODUCT_APP_ID_MAP)) {
    const legacyRows = db
      .prepare(`SELECT id, slot FROM lab_integration_bindings WHERE host_app_id = ?`)
      .all(oldHost) as Array<{ id: string; slot: string }>;
    for (const row of legacyRows) {
      const onNewHost = db
        .prepare(`SELECT id FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ? LIMIT 1`)
        .get(newHost, row.slot) as { id: string } | undefined;
      if (onNewHost) {
        db.prepare(`DELETE FROM lab_integration_bindings WHERE id = ?`).run(row.id);
      } else {
        db.prepare(`UPDATE lab_integration_bindings SET host_app_id = ? WHERE id = ?`).run(newHost, row.id);
      }
    }
    db.prepare(`UPDATE lab_integration_bindings SET provider_app_id = ? WHERE provider_app_id = ?`).run(
      newHost,
      oldHost,
    );
  }
}

function migrateIntegrationBindings(db: Database): void {
  if (!tableExists(db, 'lab_integration_bindings')) {
    return;
  }
  migrateIntegrationBindingHosts(db);
  const rows = db
    .prepare(`SELECT id, host_app_id, provider_app_id, config_json FROM lab_integration_bindings`)
    .all() as Array<{ id: string; host_app_id: string; provider_app_id: string; config_json: string | null }>;
  const update = db.prepare(
    `UPDATE lab_integration_bindings SET host_app_id = ?, provider_app_id = ?, config_json = ? WHERE id = ?`,
  );
  for (const row of rows) {
    const host = replaceAppIdStrings(row.host_app_id);
    const provider = replaceAppIdStrings(row.provider_app_id);
    const config = replaceAppIdStrings(row.config_json ?? '{}');
    if (host !== row.host_app_id || provider !== row.provider_app_id || config !== (row.config_json ?? '{}')) {
      update.run(host, provider, config, row.id);
    }
  }
  const duplicateGroups = db
    .prepare(
      `SELECT host_app_id, slot FROM lab_integration_bindings
       GROUP BY host_app_id, slot HAVING COUNT(*) > 1`,
    )
    .all() as Array<{ host_app_id: string; slot: string }>;
  for (const group of duplicateGroups) {
    const ids = db
      .prepare(
        `SELECT id FROM lab_integration_bindings WHERE host_app_id = ? AND slot = ? ORDER BY rowid ASC`,
      )
      .all(group.host_app_id, group.slot) as Array<{ id: string }>;
    for (let i = 1; i < ids.length; i++) {
      db.prepare(`DELETE FROM lab_integration_bindings WHERE id = ?`).run(ids[i].id);
    }
  }
}

function migrateTextColumn(db: Database, table: string, column: string, idColumn = 'id'): void {
  if (!tableExists(db, table)) {
    return;
  }
  const rows = db.prepare(`SELECT ${idColumn} as row_id, ${column} as val FROM ${table} WHERE ${column} IS NOT NULL`).all() as Array<{
    row_id: string | number;
    val: string;
  }>;
  const update = db.prepare(`UPDATE ${table} SET ${column} = ? WHERE ${idColumn} = ?`);
  for (const row of rows) {
    const next = replaceAppIdStrings(row.val);
    if (next !== row.val) {
      update.run(next, row.row_id);
    }
  }
}

function migrateUserAppPermissions(db: Database): void {
  if (!tableExists(db, 'user_app_permissions')) {
    return;
  }
  const rows = db.prepare(`SELECT userid, appId FROM user_app_permissions`).all() as Array<{
    userid: number;
    appId: string;
  }>;
  for (const row of rows) {
    const next = replaceAppIdStrings(row.appId);
    if (next !== row.appId) {
      db.prepare(`UPDATE user_app_permissions SET appId = ? WHERE userid = ? AND appId = ?`).run(
        next,
        row.userid,
        row.appId,
      );
    }
  }
}

function migrateAppTagAssignments(db: Database): void {
  if (!tableExists(db, 'app_tag_assignments')) {
    return;
  }
  const rows = db.prepare(`SELECT app_id, tag_id, position FROM app_tag_assignments`).all() as Array<{
    app_id: string;
    tag_id: string;
    position: number;
  }>;
  for (const row of rows) {
    const next = replaceAppIdStrings(row.app_id);
    if (next !== row.app_id) {
      db.prepare(
        `UPDATE app_tag_assignments SET app_id = ? WHERE app_id = ? AND tag_id = ? AND position = ?`,
      ).run(next, row.app_id, row.tag_id, row.position);
    }
  }
}

/** Idempotent migration for existing developer databases. */
export function migrateLegacyPlatformProductAppIds(db: Database): void {
  for (const [oldId, newId] of Object.entries(LEGACY_PLATFORM_PRODUCT_APP_ID_MAP)) {
    migrateUserAppPermissionsForPair(db, oldId, newId);
    migrateUserAppDomainRolesForPair(db, oldId, newId);
    migrateAppsRow(db, oldId, newId);
  }
  migrateJsonColumnsOnApps(db);
  migrateIntegrationBindings(db);
  migrateUserAppPermissions(db);
  migrateAppTagAssignments(db);
  migrateTextColumn(db, 'lab_workflows', 'definition_json');
  migrateTextColumn(db, 'lab_rules', 'definition_json');
  migrateTextColumn(db, 'lab_domain_events', 'type');
}

export function removeRetiredRulesEngineApp(db: Database): void {
  db.prepare(`DELETE FROM apps WHERE id = 'app-lab-rules-engine'`).run();
}
