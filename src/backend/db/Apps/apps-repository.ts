import {
  createAppsTable,
  createIndexes,
  seedApps,
  AppsSQLStatementKeys,
  createAppsSQLStatements,
  AppsSQLStatementKey
} from './apps-schema';
import { aiTunesInstructions } from './app-instructions/ai-tunes-app-instructions';
import { dndExamplesInstructions } from './app-instructions/dnd-examples-app-instructions';
import { exampleServerInstructions } from './app-instructions/example-server-app-instructions';
import { uiComponentGalleryInstructions } from './app-instructions/ui-component-gallery-app-instructions';
import { taskListInstructions } from './app-instructions/task-list-app-instructions';
import { formsBuilderInstructions } from './app-instructions/forms-builder-app-instructions';
import { crmAppInstructions } from './app-instructions/crm-app-instructions';
import { helpDeskAppInstructions } from './app-instructions/help-desk-app-instructions';
import { solitaireAppInstructions } from './app-instructions/solitaire-app-instructions';
import { wordTileAppInstructions } from './app-instructions/word-tile-app-instructions';
import { okrGoalsAppInstructions } from './app-instructions/okr-goals-app-instructions';
import { travelItineraryAppInstructions } from './app-instructions/travel-itinerary-app-instructions';
import { projectCharterAppInstructions } from './app-instructions/project-charter-app-instructions';
import { timeTrackingAppInstructions } from './app-instructions/time-tracking-app-instructions';
import { jobApplicantTrackerAppInstructions } from './app-instructions/job-applicant-tracker-app-instructions';
import { suggestionBoxAppInstructions } from './app-instructions/suggestion-box-app-instructions';
import { expenseReportsAppInstructions } from './app-instructions/expense-reports-app-instructions';
import { knowledgeBaseAppInstructions } from './app-instructions/knowledge-base-app-instructions';
import { trainingQuizzesAppInstructions } from './app-instructions/training-quizzes-app-instructions';
import { onboardingChecklistAppInstructions } from './app-instructions/onboarding-checklist-app-instructions';
import { weatherDashboardAppInstructions } from './app-instructions/weather-dashboard-app-instructions';
import { homeMaintenanceAppInstructions } from './app-instructions/home-maintenance-app-instructions';
import { rentalPropertyAppInstructions } from './app-instructions/rental-property-app-instructions';
import { eventRsvpAppInstructions } from './app-instructions/event-rsvp-app-instructions';
import { pollsSurveysAppInstructions } from './app-instructions/polls-surveys-app-instructions';
import {
  battleshipAppInstructions,
  checkersAppInstructions,
  chessAppInstructions,
  connectFourAppInstructions,
  hangmanAppInstructions,
  pokerHoldemAppInstructions,
  ticTacToeAppInstructions,
} from './app-instructions/shared-games-app-instructions';
import { chartBuilderAppInstructions } from './app-instructions/chart-builder-app-instructions';
import { ALL_CATALOG_APP_SPECS, SOLITAIRE_APP_DESCRIPTION } from './catalog-app-registration-specs';
import { labAppBuilderCatalogAppInstructions } from './app-instructions/lab-app-builder-app-instructions';
import { labApprovalsPoliciesAppInstructions } from './app-instructions/lab-approvals-policies-app-instructions';
import { labFinancialLedgerAppInstructions } from './app-instructions/lab-financial-ledger-app-instructions';
import { labWorkflowStudioAppInstructions } from './app-instructions/lab-workflow-studio-app-instructions';
import {
  migrateLegacyPlatformProductAppIds,
  removeRetiredRulesEngineApp,
} from './platform-product-app-id-migration';
import {
  LAB_APPROVALS_APP_ID,
  LAB_APP_BUILDER_APP_ID,
  LAB_CHART_BUILDER_APP_ID,
  LAB_CRM_APP_ID,
  LAB_FORMS_BUILDER_APP_ID,
  LAB_HELP_DESK_APP_ID,
  LAB_KNOWLEDGE_BASE_APP_ID,
  LAB_LEDGER_APP_ID,
  LAB_TASK_LIST_APP_ID,
  LAB_WORKFLOW_STUDIO_APP_ID,
} from '@/shared/config/platform-lab-product-app-ids';
import type { Statement } from 'better-sqlite3';
import { IApp, AppType } from '../../../shared/types/app/app.d';
import { Repository } from '../Repository';
import type { AppLabIntegrationManifestV1 } from '@/shared/types/lab-integration-manifest';
import { parseAppLabIntegrationManifest } from '@/shared/types/schemas/lab-integration-manifest-schema';
import {
  CHART_BUILDER_INTEGRATION_MANIFEST,
  FORMS_BUILDER_INTEGRATION_MANIFEST,
  HELP_DESK_INTEGRATION_MANIFEST,
  TASK_LIST_INTEGRATION_MANIFEST,
} from './integration-manifest-seeds';
import { PLATFORM_CATALOG_MANIFEST_SEEDS } from '@/shared/lab-integrations/platform-catalog-manifests';
import { CATALOG_MANIFEST_SEEDS } from '@/shared/lab-integrations/catalog-manifests';
import {
  CRM_INTEGRATION_MANIFEST,
  mergePreservedCustomCrmManifestEntities,
} from '@/shared/lab-integrations/crm-integration-manifest-builder';
import {
  CANONICAL_CRM_OPTIONAL_DEPENDENCIES,
  CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES,
  CANONICAL_REPORTING_APP_DEPENDENCIES,
} from '@/shared/config/platform-app-dependency-order';

interface AppDbRow {
  id: string;
  name: string;
  description: string;
  fa_icon: string;
  order_num: number;
  type: string;
  component_path: string | null;
  server_config: string | null;
  metadata: string | null;
  dependencies: string | null;
  optional_dependencies: string | null;
  requires_port: number | null;
  version: string;
  changelog: string | null;
  latest_version: string;
  is_update_available: number;
  is_enabled: number;
  is_server_side_enabled: number;
  is_system: number;
  app_system_instructions: string | null;
  integration_manifest: string | null;
}

export class AppsRepository extends Repository {
  private statements = {} as Record<AppsSQLStatementKey, Statement>;

  close(): void {
    this.statements = {} as Record<AppsSQLStatementKey, Statement>;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createAppsTable);
      this.db.exec(createIndexes);
      this.ensureIsSystemColumn();
      this.ensureIntegrationManifestColumn();
      this.removeRetiredFormsBuilderTestApps();
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM apps').get() as { count: number };
      const count = countResult.count;
      if (count === 0 && typeof count === 'number') {
        this.db.exec(seedApps);
      }
      migrateLegacyPlatformProductAppIds(this.db);
      removeRetiredRulesEngineApp(this.db);
      this.fixCrmServerEntryPath();
      this.syncCrmTaskListDependency();
      this.syncHelpDeskReportingDependencies();
      this.syncChartBuilderFormsDependency();
      this.ensureCrmAppRegistered();
      this.ensureLabTaskListAppRegistered();
      this.ensureHelpDeskAppRegistered();
      this.ensureChartBuilderAppRegistered();
      this.ensureCatalogAppsRegistered();
      this.repairBlackjackFaIcon();
      this.repairSolitaireAppDescription();
      this.ensureKnowledgeBasePlatformRegistration();
      this.syncKnowledgeBaseReportingDependencies();
      this.ensurePlatformCatalogAppsRegistered();
      this.syncPlatformCatalogIntegrationHostDependencies();
      this.syncPlatformHeroAppFlags();
      this.removeRetiredNotificationHubApp();
      this.syncWorkflowStudioNativeUiCleanup();
      this.syncSeededAppSystemInstructions();
      this.syncSeededAppDisplayOrder();
      this.statements = createAppsSQLStatements(this.db);
      this.syncRm64IntegrationManifests();
    }
  }

  private ensureIntegrationManifestColumn(): void {
    const columns = this.db.prepare('PRAGMA table_info(apps)').all() as { name: string }[];
    if (!columns.some((c) => c.name === 'integration_manifest')) {
      this.db.exec('ALTER TABLE apps ADD COLUMN integration_manifest TEXT');
    }
  }

  /** rm-64 — seed integration manifests for pilot apps (idempotent overwrite). */
  private syncRm64IntegrationManifests(): void {
    const seeds: Array<[string, AppLabIntegrationManifestV1]> = [
      [LAB_TASK_LIST_APP_ID, TASK_LIST_INTEGRATION_MANIFEST],
      [LAB_HELP_DESK_APP_ID, HELP_DESK_INTEGRATION_MANIFEST],
      [LAB_FORMS_BUILDER_APP_ID, FORMS_BUILDER_INTEGRATION_MANIFEST],
      [LAB_CHART_BUILDER_APP_ID, CHART_BUILDER_INTEGRATION_MANIFEST],
      [LAB_CRM_APP_ID, CRM_INTEGRATION_MANIFEST],
      ...PLATFORM_CATALOG_MANIFEST_SEEDS,
      ...CATALOG_MANIFEST_SEEDS,
    ];
    const stmt = this.db.prepare(
      `UPDATE apps SET integration_manifest = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    for (const [appId, manifest] of seeds) {
      const toStore =
        appId === LAB_CRM_APP_ID
          ? mergePreservedCustomCrmManifestEntities(
              manifest,
              this.getIntegrationManifest(appId),
            )
          : manifest;
      stmt.run(JSON.stringify(toStore), appId);
    }
  }

  setIntegrationManifest(appId: string, manifest: AppLabIntegrationManifestV1): void {
    this.db
      .prepare(
        `UPDATE apps SET integration_manifest = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(JSON.stringify(manifest), appId);
  }

  getIntegrationManifest(appId: string): AppLabIntegrationManifestV1 | null {
    const app = this.getAppsById(appId);
    return app?.integrationManifest ?? null;
  }

  /** Migrate existing databases: add is_system and mark platform core apps. */
  private ensureIsSystemColumn(): void {
    const columns = this.db.prepare('PRAGMA table_info(apps)').all() as { name: string }[];
    if (!columns.some((c) => c.name === 'is_system')) {
      this.db.exec('ALTER TABLE apps ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0');
    }
    this.syncPlatformHeroAppFlags();
  }

  /** Platform spotlight row (`is_system`); excluded from tag browse sections. */
  private static readonly PLATFORM_HERO_APP_IDS = [
    LAB_CRM_APP_ID,
    LAB_HELP_DESK_APP_ID,
    LAB_TASK_LIST_APP_ID,
    LAB_FORMS_BUILDER_APP_ID,
    LAB_CHART_BUILDER_APP_ID,
    'app-lab-workflow-studio',
    'app-lab-approvals-policies',
    'app-lab-financial-ledger',
    'app-lab-app-builder',
    // rm-64 §30.8 — Knowledge Base is the lab's documentation hub.
    'app-knowledge-base',
  ] as const;

  private syncPlatformHeroAppFlags(): void {
    const placeholders = AppsRepository.PLATFORM_HERO_APP_IDS.map(() => '?').join(', ');
    this.db
      .prepare(`UPDATE apps SET is_system = 1 WHERE id IN (${placeholders})`)
      .run(...AppsRepository.PLATFORM_HERO_APP_IDS);
  }

  /** CRM scaffold used server.ts as spawn entry; process exited immediately without entry.ts bootstrap. */
  private fixCrmServerEntryPath(): void {
    this.db.prepare(
      `UPDATE apps SET server_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND server_config LIKE '%/back-end/server.ts%'`,
    ).run('{"entry":"/src/apps/lab-crm/back-end/entry.ts","port":3010,"env":{"NODE_ENV":"development"}}', LAB_CRM_APP_ID);
  }

  /** Wave B — launch Forms Builder / Chart Builder when platform catalog hosts have bindings. */
  private syncPlatformCatalogIntegrationHostDependencies(): void {
    const requiredByApp: Array<[string, string[]]> = [
      ['app-lab-approvals-policies', [LAB_FORMS_BUILDER_APP_ID]],
      ['app-lab-financial-ledger', [LAB_FORMS_BUILDER_APP_ID, LAB_CHART_BUILDER_APP_ID]],
      ['app-lab-app-builder', [LAB_FORMS_BUILDER_APP_ID]],
    ];
    const update = this.db.prepare(
      `UPDATE apps SET dependencies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    for (const [appId, required] of requiredByApp) {
      const row = this.db
        .prepare(`SELECT dependencies FROM apps WHERE id = ?`)
        .get(appId) as { dependencies?: string } | undefined;
      if (!row) {
        continue;
      }
      let deps: string[] = [];
      try {
        deps = JSON.parse(row.dependencies ?? '[]') as string[];
      } catch {
        deps = [];
      }
      const merged = [...deps];
      for (const id of required) {
        if (!merged.includes(id)) {
          merged.push(id);
        }
      }
      if (merged.length === deps.length && required.every((id) => deps.includes(id))) {
        continue;
      }
      update.run(JSON.stringify(merged), appId);
    }
  }

  /** Phase 2 platform features — browser catalog launchers (Settings UI embedded in apps workspace). */
  private ensurePlatformCatalogAppsRegistered(): void {
    const insert = this.db.prepare(
      `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const exists = this.db.prepare(`SELECT id FROM apps WHERE id = ?`);

    const catalogApps: Array<{
      id: string;
      name: string;
      description: string;
      faIcon: string;
      order: number;
      componentPath: string;
      instructions: string;
    }> = [
      {
        id: 'app-lab-workflow-studio',
        name: 'Workflow Studio',
        description: 'Design and manage lab automation workflows on the domain event bus',
        faIcon: 'fa-diagram-project',
        order: 11,
        componentPath: '/src/apps/lab-workflow-studio/front-end/App.vue',
        instructions: labWorkflowStudioAppInstructions,
      },
      {
        id: 'app-lab-approvals-policies',
        name: 'Approvals & Policies',
        description: 'Approval inbox and configurable approval policies',
        faIcon: 'fa-clipboard-check',
        order: 12,
        componentPath: '/src/apps/lab-approvals-policies/front-end/App.vue',
        instructions: labApprovalsPoliciesAppInstructions,
      },
      {
        id: 'app-lab-financial-ledger',
        name: 'Financial Ledger',
        description: 'Platform journal and chart of accounts',
        faIcon: 'fa-book',
        order: 13,
        componentPath: '/src/apps/lab-financial-ledger/front-end/App.vue',
        instructions: labFinancialLedgerAppInstructions,
      },
      {
        id: 'app-lab-app-builder',
        name: 'App Builder',
        description: 'Scaffold new lab apps with Sidecar and App Management tools',
        faIcon: 'fa-hammer',
        order: 14,
        componentPath: '/src/apps/lab-app-builder/front-end/App.vue',
        instructions: labAppBuilderCatalogAppInstructions,
      },
    ];

    for (const app of catalogApps) {
      if (exists.get(app.id)) {
        continue;
      }
      insert.run(
        app.id,
        app.name,
        app.description,
        app.faIcon,
        app.order,
        'browser',
        app.componentPath,
        '{}',
        JSON.stringify({
          author: 'developer',
          version: '1.0.0',
          tags: ['platform'],
          category: 'Platform',
        }),
        app.instructions,
        1,
        0,
        '[]',
        '[]',
        null,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        1,
      );
    }
  }

  /** Register CRM on existing DBs (seedApps only runs when apps table is empty). */
  private ensureCrmAppRegistered(): void {
    const serverConfig =
      '{"entry":"/src/apps/lab-crm/back-end/entry.ts","port":3010,"env":{"NODE_ENV":"development"}}';
    const existing = this.db
      .prepare(`SELECT id, server_config FROM apps WHERE id = ?`)
      .get(LAB_CRM_APP_ID) as { id?: string; server_config?: string | null } | undefined;
    if (existing?.id) {
      let needsServerConfig = !existing.server_config;
      if (existing.server_config) {
        try {
          const parsed = JSON.parse(existing.server_config) as { port?: number };
          needsServerConfig = parsed.port == null;
        } catch {
          needsServerConfig = true;
        }
      }
      if (needsServerConfig) {
        this.db
          .prepare(
            `UPDATE apps SET server_config = ?, requires_port = 3010, is_server_side_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(serverConfig, LAB_CRM_APP_ID);
      }
      return;
    }
    this.db
      .prepare(
        `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        LAB_CRM_APP_ID,
        'CRM',
        'Customer relationship management with dynamic entities and Forms Builder integration',
        'fa-building',
        1,
        'hybrid',
        '/src/apps/lab-crm/front-end/App.vue',
        serverConfig,
        '{"author":"developer","version":"1.0.0","tags":["crm"],"category":"Custom"}',
        crmAppInstructions,
        1,
        1,
        `["${LAB_FORMS_BUILDER_APP_ID}","${LAB_TASK_LIST_APP_ID}","${LAB_HELP_DESK_APP_ID}"]`,
        '[]',
        3010,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        1,
      );
  }

  /** Register Task List on existing DBs and repair missing hybrid server_config. */
  private ensureLabTaskListAppRegistered(): void {
    const serverConfig =
      '{"entry":"/src/apps/lab-tasklist/back-end/entry.ts","port":3005,"env":{"NODE_ENV":"development"}}';
    const existing = this.db
      .prepare(`SELECT id, server_config FROM apps WHERE id = ?`)
      .get(LAB_TASK_LIST_APP_ID) as { id?: string; server_config?: string | null } | undefined;
    if (existing?.id) {
      let needsServerConfig = !existing.server_config;
      if (existing.server_config) {
        try {
          const parsed = JSON.parse(existing.server_config) as { port?: number };
          needsServerConfig = parsed.port == null;
        } catch {
          needsServerConfig = true;
        }
      }
      if (needsServerConfig) {
        this.db
          .prepare(
            `UPDATE apps SET server_config = ?, requires_port = 3005, is_server_side_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(serverConfig, LAB_TASK_LIST_APP_ID);
      }
      return;
    }
    this.db
      .prepare(
        `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        LAB_TASK_LIST_APP_ID,
        'Task List',
        'Keep yourself organized with the AI managed Task List!',
        'fa-list-check',
        3,
        'hybrid',
        '/src/apps/lab-tasklist/front-end/App.vue',
        serverConfig,
        '{"author":"developer","version":"1.0.0","tags":["task list"],"category":"Custom"}',
        taskListInstructions,
        1,
        1,
        `["${LAB_FORMS_BUILDER_APP_ID}"]`,
        '[]',
        3005,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        1,
      );
  }

  /** Register Help Desk on existing DBs (seedApps only runs when apps table is empty). */
  private ensureHelpDeskAppRegistered(): void {
    const existing = this.db
      .prepare(`SELECT id FROM apps WHERE id = ?`)
      .get(LAB_HELP_DESK_APP_ID) as { id?: string } | undefined;
    if (existing?.id) {
      return;
    }
    this.db
      .prepare(
        `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        LAB_HELP_DESK_APP_ID,
        'Help Desk',
        'Support tickets with CRM record linkage via metadata',
        'fa-life-ring',
        2,
        'hybrid',
        '/src/apps/lab-helpdesk/front-end/App.vue',
        '{"entry":"/src/apps/lab-helpdesk/back-end/entry.ts","port":3012,"env":{"NODE_ENV":"development"}}',
        '{"author":"developer","version":"1.0.0","tags":["help-desk"],"category":"Custom"}',
        helpDeskAppInstructions,
        1,
        1,
        `["${LAB_FORMS_BUILDER_APP_ID}","${LAB_CHART_BUILDER_APP_ID}"]`,
        '[]',
        3012,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        1,
      );
  }

  /**
   * Register the catalogue apps that `seedApps` does not cover — the games (21–29) and the
   * Wave C catalog apps (30–43).
   *
   * `seedApps` only runs when the `apps` table is empty and never listed these, so they were
   * registered historically by one-off scripts. That left a fresh clone with folders on disk
   * and no rows: the apps could not launch, every `UPDATE ... WHERE id = ?` aimed at them
   * matched zero rows, and the old `pre-bootstrap` orphan sweeper would delete their folders.
   *
   * Additive only — an existing row is left untouched, so user edits survive.
   */
  private ensureCatalogAppsRegistered(): void {
    const exists = this.db.prepare(`SELECT id FROM apps WHERE id = ?`);
    const insert = this.db.prepare(
      `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const spec of ALL_CATALOG_APP_SPECS) {
      if (exists.get(spec.id)) {
        continue;
      }
      insert.run(
        spec.id,
        spec.name,
        spec.description,
        spec.faIcon,
        spec.order,
        'hybrid',
        `/src/apps/${spec.slug}/front-end/App.vue`,
        JSON.stringify({
          entry: `/src/apps/${spec.slug}/back-end/entry.ts`,
          port: spec.port,
          env: { NODE_ENV: 'development' },
        }),
        JSON.stringify({
          author: 'developer',
          version: '1.0.0',
          tags: [spec.tag, spec.slug],
          category: spec.isGame ? 'Games' : 'Custom',
        }),
        spec.instructions,
        1,
        1,
        '[]',
        '[]',
        spec.port,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        0,
      );
    }
  }

  /** `fa-spade` is not in the loaded Font Awesome solid set — card was blank on the catalog grid. */
  private repairBlackjackFaIcon(): void {
    this.db
      .prepare(
        `UPDATE apps SET fa_icon = 'fa-heart', updated_at = CURRENT_TIMESTAMP WHERE id = 'app-blackjack' AND fa_icon = 'fa-spade'`,
      )
      .run();
  }

  /** Retire the old global-leaderboard catalog blurb; v1 is solo + personal bests only. */
  private repairSolitaireAppDescription(): void {
    this.db
      .prepare(
        `UPDATE apps SET description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = 'app-solitaire' AND description LIKE '%leaderboard%'`,
      )
      .run(SOLITAIRE_APP_DESCRIPTION);
  }

  /**
   * Register Chart Builder on existing DBs.
   *
   * Chart Builder is a Wave A platform app whose *content* (charts, connectors, bindings) is
   * seeded by `syncPlatformCatalogBindingSeeds()` on every boot — but nothing ever inserted its
   * registry row. The result was an app that worked at the database level and could not launch,
   * while eleven `UPDATE ... WHERE id = 'app-lab-chartbuilder'` statements elsewhere in this
   * class silently matched zero rows.
   *
   * `seedApps` only runs when the `apps` table is empty, so this must be idempotent and run on
   * every `initialize()` — same pattern as `ensureHelpDeskAppRegistered()`.
   */
  private ensureChartBuilderAppRegistered(): void {
    const existing = this.db
      .prepare(`SELECT id FROM apps WHERE id = ?`)
      .get(LAB_CHART_BUILDER_APP_ID) as { id?: string } | undefined;
    if (existing?.id) {
      return;
    }
    this.db
      .prepare(
        `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        LAB_CHART_BUILDER_APP_ID,
        'Chart Builder',
        'Design reusable chart definitions and data connectors that host apps render',
        'fa-chart-column',
        // Matches SEEDED_APP_ORDER for this app.
        10,
        'hybrid',
        '/src/apps/lab-chartbuilder/front-end/App.vue',
        // DEFAULT_CHART_BUILDER_PORT
        '{"entry":"/src/apps/lab-chartbuilder/back-end/entry.ts","port":3013,"env":{"NODE_ENV":"development"}}',
        '{"author":"developer","version":"1.0.0","tags":["platform","charts"],"category":"Platform"}',
        chartBuilderAppInstructions,
        1,
        1,
        // The chart designer's forms are Forms Builder-backed (syncChartBuilderFormsDependency).
        `["${LAB_FORMS_BUILDER_APP_ID}"]`,
        '[]',
        3013,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        1,
      );
  }

  /**
   * rm-64 §30.8 — promote Knowledge Base to a platform app.
   *
   * KB is the lab's documentation hub: humans read it in the app, agents read it through the
   * KB MCP server. Both need it reachable without the user opening it first, so it becomes a
   * protected platform app (warm on boot, like Workflow Studio / Approvals / Ledger).
   *
   * Registry metadata is authored in code here — the same sanctioned path used by
   * `ensureHelpDeskAppRegistered()` — so fresh installs and existing DBs converge on boot.
   * Idempotent: rewrites the platform fields on every start and leaves user-editable fields
   * (description, tags) alone when the row already exists.
   */
  private ensureKnowledgeBasePlatformRegistration(): void {
    const serverConfig = JSON.stringify({
      entry: '/src/apps/knowledge-base/back-end/entry.ts',
      port: 3016,
      env: { NODE_ENV: 'development' },
    });
    const existing = this.db
      .prepare(`SELECT id FROM apps WHERE id = ?`)
      .get(LAB_KNOWLEDGE_BASE_APP_ID) as { id?: string } | undefined;

    if (existing?.id) {
      // Existing row: promote in place without disturbing user-authored metadata.
      this.db
        .prepare(
          `UPDATE apps
             SET type = 'hybrid',
                 server_config = ?,
                 is_system = 1,
                 is_enabled = 1,
                 is_server_side_enabled = 1,
                 requires_port = 3016,
                 fa_icon = 'fa-book',
                 app_system_instructions = ?,
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        )
        .run(serverConfig, knowledgeBaseAppInstructions, LAB_KNOWLEDGE_BASE_APP_ID);
      return;
    }

    this.db
      .prepare(
        `INSERT INTO apps (
          id, name, description, fa_icon, order_num, type, component_path, server_config,
          metadata, app_system_instructions, is_enabled, is_server_side_enabled,
          dependencies, optional_dependencies, requires_port, version, changelog,
          latest_version, is_update_available, is_system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        LAB_KNOWLEDGE_BASE_APP_ID,
        'Knowledge base',
        "The lab's documentation hub — platform, app and integration knowledge for humans and agents",
        'fa-book',
        2,
        'hybrid',
        '/src/apps/knowledge-base/front-end/App.vue',
        serverConfig,
        '{"author":"developer","version":"1.0.0","tags":["learning","knowledge"],"category":"Learning"}',
        knowledgeBaseAppInstructions,
        1,
        1,
        JSON.stringify([...CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES]),
        '[]',
        3016,
        '1.0.0',
        '[]',
        '1.0.0',
        0,
        1,
      );
  }

  /** rm-58 scope amend: lab events are platform-hosted on :3000 — no catalog app. */
  private removeRetiredNotificationHubApp(): void {
    this.db.prepare(`DELETE FROM apps WHERE id = 'app-notification-hub'`).run();
  }

  /**
   * Platform catalog apps with native UI — drop Forms Builder integration manifest,
   * bindings, and promoted launch dependencies on existing databases.
   */
  private syncPlatformCatalogNativeUiCleanup(appId: string): void {
    const row = this.db
      .prepare(`SELECT dependencies, metadata FROM apps WHERE id = ?`)
      .get(appId) as { dependencies?: string; metadata?: string } | undefined;
    if (!row) {
      return;
    }

    const bindingsTable = this.db
      .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'lab_integration_bindings'`)
      .get();
    if (bindingsTable) {
      this.db
        .prepare(`DELETE FROM lab_integration_bindings WHERE host_app_id = ?`)
        .run(appId);
    }

    let deps: string[] = [];
    try {
      deps = JSON.parse(row.dependencies ?? '[]') as string[];
    } catch {
      deps = [];
    }
    const isInfraDep = (id: string) =>
      id === LAB_FORMS_BUILDER_APP_ID || id === LAB_CHART_BUILDER_APP_ID;
    const nextDeps = deps.filter((id) => !isInfraDep(id));

    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(row.metadata ?? '{}') as Record<string, unknown>;
    } catch {
      metadata = {};
    }
    const promoted = metadata.integrationPromotedDeps;
    if (Array.isArray(promoted)) {
      metadata.integrationPromotedDeps = promoted.filter(
        (id) => typeof id === 'string' && !isInfraDep(id),
      );
    }

    this.db
      .prepare(
        `UPDATE apps SET integration_manifest = NULL, dependencies = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(JSON.stringify(nextDeps), JSON.stringify(metadata), appId);
  }

  /** Workflow Studio uses Settings graph editor (no Forms Builder host). */
  private syncWorkflowStudioNativeUiCleanup(): void {
    this.syncPlatformCatalogNativeUiCleanup('app-lab-workflow-studio');
  }

  /** Chart Builder designer forms (rm-64) require Forms Builder. */
  private syncChartBuilderFormsDependency(): void {
    const row = this.db
      .prepare(`SELECT dependencies FROM apps WHERE id = ?`)
      .get(LAB_CHART_BUILDER_APP_ID) as { dependencies?: string } | undefined;
    if (!row?.dependencies) {
      return;
    }
    let deps: string[] = [];
    try {
      deps = JSON.parse(row.dependencies) as string[];
    } catch {
      deps = [];
    }
    if (deps.includes(LAB_FORMS_BUILDER_APP_ID)) {
      return;
    }
    this.db
      .prepare(
        `UPDATE apps SET dependencies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(JSON.stringify([LAB_FORMS_BUILDER_APP_ID, ...deps]), LAB_CHART_BUILDER_APP_ID);
  }

  /** Help Desk metrics/charts + ticket forms require Forms Builder and Chart Builder. */
  private syncHelpDeskReportingDependencies(): void {
    const row = this.db
      .prepare(`SELECT dependencies FROM apps WHERE id = ?`)
      .get(LAB_HELP_DESK_APP_ID) as { dependencies?: string } | undefined;
    if (!row?.dependencies) {
      return;
    }
    let deps: string[] = [];
    try {
      deps = JSON.parse(row.dependencies) as string[];
    } catch {
      deps = [];
    }
    const merged: string[] = [...CANONICAL_REPORTING_APP_DEPENDENCIES];
    for (const id of deps) {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    }
    const canonicalSet = new Set<string>(CANONICAL_REPORTING_APP_DEPENDENCIES);
    const ordered = [
      ...CANONICAL_REPORTING_APP_DEPENDENCIES,
      ...merged.filter((id) => !canonicalSet.has(id)),
    ];
    if (
      ordered.length === deps.length &&
      CANONICAL_REPORTING_APP_DEPENDENCIES.every((id) => deps.includes(id))
    ) {
      return;
    }
    this.db
      .prepare(
        `UPDATE apps SET dependencies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(JSON.stringify(ordered), LAB_HELP_DESK_APP_ID);
  }

  /** Knowledge Base article dialogs + report charts require Forms Builder and Chart Builder. */
  private syncKnowledgeBaseReportingDependencies(): void {
    const row = this.db
      .prepare(`SELECT dependencies FROM apps WHERE id = ?`)
      .get(LAB_KNOWLEDGE_BASE_APP_ID) as { dependencies?: string } | undefined;
    if (!row) {
      return;
    }
    let deps: string[] = [];
    try {
      deps = JSON.parse(row.dependencies ?? '[]') as string[];
    } catch {
      deps = [];
    }
    const merged: string[] = [...CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES];
    for (const id of deps) {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    }
    const canonicalSet = new Set<string>(CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES);
    const ordered = [
      ...CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES,
      ...merged.filter((id) => !canonicalSet.has(id)),
    ];
    if (
      ordered.length === deps.length &&
      CANONICAL_KNOWLEDGE_BASE_DEPENDENCIES.every((id) => deps.includes(id))
    ) {
      return;
    }
    this.db
      .prepare(
        `UPDATE apps SET dependencies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(JSON.stringify(ordered), LAB_KNOWLEDGE_BASE_APP_ID);
  }

  /** CRM tasks integration: require Task List alongside Forms Builder. */
  private syncCrmTaskListDependency(): void {
    const row = this.db
      .prepare(`SELECT dependencies FROM apps WHERE id = ?`)
      .get(LAB_CRM_APP_ID) as { dependencies?: string } | undefined;
    if (!row?.dependencies) {
      return;
    }
    let deps: string[] = [];
    try {
      deps = JSON.parse(row.dependencies) as string[];
    } catch {
      deps = [];
    }
    const required = [
      LAB_FORMS_BUILDER_APP_ID,
      LAB_TASK_LIST_APP_ID,
      LAB_HELP_DESK_APP_ID,
      LAB_CHART_BUILDER_APP_ID,
    ];
    const merged = [...deps];
    for (const id of required) {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    }
    const optionalRow = this.db
      .prepare(`SELECT optional_dependencies FROM apps WHERE id = ?`)
      .get(LAB_CRM_APP_ID) as { optional_dependencies?: string } | undefined;
    let optionalDeps: string[] = [];
    if (optionalRow?.optional_dependencies) {
      try {
        optionalDeps = JSON.parse(optionalRow.optional_dependencies) as string[];
      } catch {
        optionalDeps = [];
      }
    }
    const optionalCatalog = [...CANONICAL_CRM_OPTIONAL_DEPENDENCIES];
    const mergedOptional = [...optionalDeps];
    for (const id of optionalCatalog) {
      if (!mergedOptional.includes(id)) {
        mergedOptional.push(id);
      }
    }

    const depsUnchanged =
      merged.length === deps.length && required.every((id) => deps.includes(id));
    const optionalUnchanged =
      mergedOptional.length === optionalDeps.length
      && optionalCatalog.every((id) => optionalDeps.includes(id));
    if (depsUnchanged && optionalUnchanged) {
      return;
    }
    this.db
      .prepare(
        `UPDATE apps SET dependencies = ?, optional_dependencies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
      .run(JSON.stringify(merged), JSON.stringify(mergedOptional), LAB_CRM_APP_ID);
  }

  /** Remove retired Forms Builder test harness apps from existing databases. */
  private removeRetiredFormsBuilderTestApps(): void {
    this.db.prepare(
      `DELETE FROM apps WHERE id IN ('app-forms-builder-test-ui', 'app-forms-builder-test-connector')`,
    ).run();
  }

  /**
   * Canonical dashboard sort order for seeded platform apps (lower = first).
   *
   * rm-64 §30.9 — the owner-supplied platform hierarchy. Applied to existing DBs by
   * `syncSeededAppDisplayOrder()`, so this table and the registry rows cannot disagree.
   * Catalog apps keep their own numbering, which starts above these values.
   */
  private static readonly SEEDED_APP_ORDER: Record<string, number> = {
    [LAB_APP_BUILDER_APP_ID]: 1,
    [LAB_KNOWLEDGE_BASE_APP_ID]: 2,
    [LAB_WORKFLOW_STUDIO_APP_ID]: 3,
    [LAB_CRM_APP_ID]: 4,
    [LAB_APPROVALS_APP_ID]: 5,
    [LAB_LEDGER_APP_ID]: 6,
    [LAB_HELP_DESK_APP_ID]: 7,
    [LAB_TASK_LIST_APP_ID]: 8,
    [LAB_FORMS_BUILDER_APP_ID]: 9,
    [LAB_CHART_BUILDER_APP_ID]: 10,
    'app-ai-tunes': 11,
    'app-dnd-examples': 12,
    'app-ui-component-gallery': 13,
    'app-example-server': 14,
  };

  /** Refresh display order for known seeded apps (existing DBs; INSERT OR IGNORE does not update order). */
  private syncSeededAppDisplayOrder(): void {
    const update = this.db.prepare(
      `UPDATE apps SET order_num = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    for (const [appId, orderNum] of Object.entries(AppsRepository.SEEDED_APP_ORDER)) {
      update.run(orderNum, appId);
    }
  }

  /** Refresh platform-authored system instructions after instruction source updates. */
  private syncSeededAppSystemInstructions(): void {
    const update = this.db.prepare(
      `UPDATE apps SET app_system_instructions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    const pairs: [string, string][] = [
      [aiTunesInstructions, 'app-ai-tunes'],
      [dndExamplesInstructions, 'app-dnd-examples'],
      [exampleServerInstructions, 'app-example-server'],
      [uiComponentGalleryInstructions, 'app-ui-component-gallery'],
      [taskListInstructions, LAB_TASK_LIST_APP_ID],
      [formsBuilderInstructions, LAB_FORMS_BUILDER_APP_ID],
      [crmAppInstructions, LAB_CRM_APP_ID],
      [helpDeskAppInstructions, LAB_HELP_DESK_APP_ID],
      [solitaireAppInstructions, 'app-solitaire'],
      [wordTileAppInstructions, 'app-word-tile'],
      [okrGoalsAppInstructions, 'app-okr-goals'],
      [travelItineraryAppInstructions, 'app-travel-itinerary'],
      [projectCharterAppInstructions, 'app-project-charter'],
      [timeTrackingAppInstructions, 'app-time-tracking'],
      [jobApplicantTrackerAppInstructions, 'app-job-applicant-tracker'],
      [suggestionBoxAppInstructions, 'app-suggestion-box'],
      [expenseReportsAppInstructions, 'app-expense-reports'],
      [knowledgeBaseAppInstructions, 'app-knowledge-base'],
      [trainingQuizzesAppInstructions, 'app-training-quizzes'],
      [onboardingChecklistAppInstructions, 'app-onboarding-checklist'],
      [weatherDashboardAppInstructions, 'app-weather-dashboard'],
      [homeMaintenanceAppInstructions, 'app-home-maintenance'],
      [rentalPropertyAppInstructions, 'app-rental-property'],
      [eventRsvpAppInstructions, 'app-event-rsvp'],
      [pollsSurveysAppInstructions, 'app-polls-surveys'],
      [checkersAppInstructions, 'app-checkers'],
      [chessAppInstructions, 'app-chess'],
      [hangmanAppInstructions, 'app-hangman'],
      [connectFourAppInstructions, 'app-connect-four'],
      [battleshipAppInstructions, 'app-battleship'],
      [pokerHoldemAppInstructions, 'app-poker-holdem'],
      [ticTacToeAppInstructions, 'app-tic-tac-toe'],
      [chartBuilderAppInstructions, LAB_CHART_BUILDER_APP_ID],
      [labWorkflowStudioAppInstructions, 'app-lab-workflow-studio'],
      [labApprovalsPoliciesAppInstructions, 'app-lab-approvals-policies'],
      [labFinancialLedgerAppInstructions, 'app-lab-financial-ledger'],
      [labAppBuilderCatalogAppInstructions, 'app-lab-app-builder'],
    ];
    for (const [instructions, appId] of pairs) {
      update.run(instructions, appId);
    }
  }

  //
  // QUERY METHODS
  //

  /**
   * Get an app by its ID
   * @param id - The app identifier
   * @returns The app object or undefined if not found
   */
  getAppsById(id: string): IApp | undefined {
    const row = this.statements[AppsSQLStatementKeys.apps_by_id].get(id) as AppDbRow | undefined;
    if (!row) return undefined;
    return this.mapRowToApp(row);
  }

  /**
   * Get an app by its name
   * @param name - The app name to search for
   * @returns The app object or undefined if not found
   */
  getAppsByName(name: string): IApp | undefined {
    const row = this.statements[AppsSQLStatementKeys.apps_by_name].get(name) as AppDbRow | undefined;
    if (!row) return undefined;
    return this.mapRowToApp(row);
  }

  /**
   * Get all apps, ordered by order_num
   * @returns Array of all app objects
   */
  getAllApps(): IApp[] {
    const rows = this.statements[AppsSQLStatementKeys.apps_all].all() as AppDbRow[];
    return rows.map((row) => this.mapRowToApp(row));
  }

  /**
   * Get all enabled apps
   * @returns Array of enabled apps
   */
  getEnabledApps(): IApp[] {
    const rows = this.statements[AppsSQLStatementKeys.apps_enabled].all() as AppDbRow[];
    return rows.map((row) => this.mapRowToApp(row));
  }

  /**
   * Get apps filtered by type
   * @param type - The app type filter ('browser', 'server', 'hybrid')
   * @returns Array of apps matching the type
   */
  getAppsByType(type: AppType): IApp[] {
    const rows = this.statements[AppsSQLStatementKeys.apps_by_type].all(type) as AppDbRow[];
    return rows.map((row) => this.mapRowToApp(row));
  }

  //
  // CRUD OPERATIONS
  //

  /**
   * Insert a new app into the database
   * @param app - The app object to insert
   */
  insertApp(app: IApp): void {
    this.db.transaction(() => {
      this.statements[AppsSQLStatementKeys.insert_app].run(
        app.id,
        app.name,
        app.description,
        app.faIcon,
        app.order,
        app.type,
        app.componentPath || null,
        JSON.stringify(app.server ?? null),
        JSON.stringify(app.metadata ?? {}),
        app.appSystemInstructions || null,
        app.isEnabled ? 1 : 0,
        app.isServerSideEnabled ? 1 : 0,
        JSON.stringify(app.dependencies ?? []),
        JSON.stringify(app.optionalDependencies ?? []),
        app.requiresPort || null,
        app.version,
        JSON.stringify(app.changelog ?? []),
        app.latestVersion || null,
        app.isUpdateAvailable ? 1 : 0,
        app.isSystem ? 1 : 0,
      );
    })();
  }

  /**
   * Update an existing app in the database
   * @param id - The app identifier
   * @param app - The updated app object
   */
  updateApp(id: string, app: IApp): void {
    this.db.transaction(() => {
      this.statements[AppsSQLStatementKeys.update_app].run(
        app.name,
        app.description,
        app.faIcon,
        app.order,
        app.type,
        app.componentPath ?? null,
        JSON.stringify(app.server ?? null),
        JSON.stringify(app.metadata ?? {}),
        app.appSystemInstructions || null,
        app.isEnabled ? 1 : 0,
        app.isServerSideEnabled ? 1 : 0,
        JSON.stringify(app.dependencies ?? []),
        JSON.stringify(app.optionalDependencies ?? []),
        app.requiresPort ?? null,
        app.version,
        JSON.stringify(app.changelog ?? []),
        app.latestVersion ?? null,
        app.isUpdateAvailable ? 1 : 0,
        id
      );
    })();
  }

  /**
   * Delete an app from the database
   * @param id - The app identifier
   */
  deleteApp(id: string): void {
    this.db.transaction(() => {
      this.statements[AppsSQLStatementKeys.delete_app].run(id);
    })();
  }

  updateAppsEnabled(
    enabledByAppId: Record<string, boolean>,
  ): { success: boolean; error?: string } {
    const apps = this.getAllApps();
    const updateStmt = this.db.prepare(
      `UPDATE apps SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );

    for (const app of apps) {
      const next = enabledByAppId[app.id];
      if (next === undefined || next === app.isEnabled) {
        continue;
      }
      if (!next && app.isSystem) {
        return { success: false, error: `Cannot disable system app "${app.id}"` };
      }
    }

    this.db.transaction(() => {
      for (const app of apps) {
        const next = enabledByAppId[app.id];
        if (next === undefined || next === app.isEnabled) {
          continue;
        }
        updateStmt.run(next ? 1 : 0, app.id);
      }
    })();

    return { success: true };
  }

  reorderApps(appIds: string[]): { success: boolean; error?: string; apps?: IApp[] } {
    const apps = this.getAllApps();
    const knownIds = new Set(apps.map((a) => a.id));
    if (appIds.length !== apps.length) {
      return { success: false, error: 'appIds must include every registered app' };
    }
    const seen = new Set<string>();
    for (const id of appIds) {
      if (!knownIds.has(id)) {
        return { success: false, error: `Unknown app id: ${id}` };
      }
      if (seen.has(id)) {
        return { success: false, error: 'Duplicate app id in appIds' };
      }
      seen.add(id);
    }
    const update = this.db.prepare(
      `UPDATE apps SET order_num = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    this.db.transaction(() => {
      appIds.forEach((id, index) => update.run(index, id));
    })();
    return { success: true, apps: this.getAllApps() };
  }

  //
  // BULK OPERATIONS
  //

  /**
   * Insert multiple apps at once
   * @param apps - Array of app objects to insert
   */
  insertApps(apps: IApp[]): void {
    for (const app of apps) {
      this.insertApp(app);
    }
  }

  /**
   * Update multiple apps
   * @param apps - Array of app objects to update (must already exist)
   */
  updateApps(apps: IApp[]): void {
    for (const app of apps) {
      this.updateApp(app.id, app);
    }
  }

  //
  // PRIVATE HELPERS
  //

  /**
   * Helper method to deserialize a database row into an IApp object
   * @param row - Raw row from database
   * @returns IApp object with JSON fields properly deserialized
   */
  private mapRowToApp(row: AppDbRow): IApp {
    const serverConfig = row.server_config ? JSON.parse(row.server_config) : undefined;
    const metadata = row.metadata ? JSON.parse(row.metadata) : {};
    const changelog = row.changelog ? JSON.parse(row.changelog) : [];

    return {
      // Core properties
      id: row.id,
      name: row.name,
      description: row.description,
      faIcon: row.fa_icon,
      order: row.order_num,
      type: row.type as AppType,
      componentPath: row.component_path ?? undefined,
      isEnabled: row.is_enabled === 1,
      isServerSideEnabled: row.is_server_side_enabled === 1,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      optionalDependencies: row.optional_dependencies ? JSON.parse(row.optional_dependencies) : [],
      requiresPort: row.requires_port ?? undefined,
      version: row.version,
      changelog: changelog,
      latestVersion: row.latest_version,
      isUpdateAvailable: row.is_update_available === 1,
      isSystem: row.is_system === 1,
      // Original nested properties for backward compatibility
      server: serverConfig,
      metadata: metadata,
      // Flattened properties for tool call compatibility
      serverEntry: serverConfig?.entry,
      serverPort: serverConfig?.port,
      serverEnv: serverConfig?.env,
      metadataCategory: metadata.category,
      metadataAuthor: metadata.author,
      metadataVersion: metadata.version,
      metadataTags: metadata.tags,
      changelogVersion: changelog.length > 0 ? changelog[0].version : undefined,
      changelogDate: changelog.length > 0 ? changelog[0].date : undefined,
      changelogNotes: changelog.length > 0 ? changelog[0].notes : undefined,
      changelogBreakingChangesMessages: changelog.length > 0 && changelog[0].breakingChanges?.messages ? changelog[0].breakingChanges.messages : undefined,
      changelogMigrationGuide: changelog.length > 0 ? changelog[0].migrationGuide : undefined,
      appSystemInstructions: row.app_system_instructions ?? undefined,
      integrationManifest: row.integration_manifest
        ? parseAppLabIntegrationManifest(JSON.parse(row.integration_manifest))
        : undefined,
    };
  }
}

export const appsRepository = new AppsRepository();
