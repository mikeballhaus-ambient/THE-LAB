import betterSqlite3, { Database } from 'better-sqlite3';
import { getDatabasePath } from '../../shared/config/database';
import { authRepository } from './Auth/auth-repository';
import { aiProviderRepository } from './AIProvider/ai-provider-repository';
import { appsRepository } from './Apps/apps-repository';
import { personaRepository } from './Persona/persona-repository';
import { commandRepository } from './Command/command-repository';
import { toolsRepository } from './Tools/tools-repository';
import { contextSettingsRepository } from './ContextSettings/context-settings-repository';
import { userInstructionsRepository } from './UserInstructions/user-instructions-repository';
import { mcpServersRepository } from './MCPServers/mcp-servers-repository';
import { mcpStdioAccessRepository } from './MCPStdioAccess/mcp-stdio-access-repository';
import { platformAuditRepository } from './PlatformAudit/platform-audit-repository';
import { oidcProvidersRepository } from './OidcProviders/oidc-providers-repository';
import { oidcProviderService } from './OidcProviders/oidc-provider-service';
import { appTagsRepository } from './AppTags/app-tags-repository';
import { labThemeRepository } from './Theme/lab-theme-repository';
import { labThemeCustomPresetRepository } from './Theme/lab-theme-custom-repository';
import { labCommsRepository } from './Comms/lab-comms-repository';
import { labSidecarActivityRepository } from './LabSidecarActivity/lab-sidecar-activity-repository';
import { labEventsRepository } from './LabEvents/lab-events-repository';
import { labDomainEventCatalogRepository } from './LabEvents/lab-domain-event-catalog-repository';
import { domainEventCatalogRegistry } from '../lab-events/domain-event-catalog-registry';
import { labRulesRepository } from './LabRules/lab-rules-repository';
import { labWorkflowsRepository } from './LabWorkflows/lab-workflows-repository';
import { labWorkflowRunsRepository } from './LabWorkflows/lab-workflow-runs-repository';
import { labWorkflowSchedulesRepository } from './LabWorkflows/lab-workflow-schedules-repository';
import { labWorkflowMockSamplesRepository } from './LabWorkflows/lab-workflow-mock-samples-repository';
import { labWorkflowVersionsRepository } from './LabWorkflows/lab-workflow-versions-repository';
import { labRequirementSweepRepository } from './LabWorkflows/lab-requirement-sweep-repository';
import { labWorkflowWebhooksRepository } from './LabWorkflows/lab-workflow-webhooks-repository';
import { labWorkflowWebhookCapturesRepository } from './LabWorkflows/lab-workflow-webhook-captures-repository';
import { labApprovalsRepository } from './LabApprovals/lab-approvals-repository';
import { labLedgerRepository } from './LabLedger/lab-ledger-repository';
import { seedDefaultLedgerJournalIfEmpty } from './LabLedger/lab-ledger-journal-seed';
import { labIntegrationsRepository } from './LabIntegrations/lab-integrations-repository';
import { seedAllPlatformCatalogDemoIfMissing } from './PlatformCatalog/platform-catalog-demo-seed';
import { labVirtualBankRepository } from './LabVirtualBank/lab-virtual-bank-repository';

export class DatabaseManager {
  private db!: Database;

  getDb(): Database {
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      authRepository.close();
      labEventsRepository.close();
      labDomainEventCatalogRepository.close();
      labRulesRepository.close();
      labWorkflowsRepository.close();
      labWorkflowRunsRepository.close();
      labWorkflowSchedulesRepository.close();
      labWorkflowMockSamplesRepository.close();
      labWorkflowVersionsRepository.close();
      labRequirementSweepRepository.close();
      labWorkflowWebhooksRepository.close();
      labWorkflowWebhookCapturesRepository.close();
      labApprovalsRepository.close();
      labLedgerRepository.close();
      labIntegrationsRepository.close();
      commandRepository.close();
      aiProviderRepository.close();
      appsRepository.close();
      toolsRepository.close();
      contextSettingsRepository.close();
      userInstructionsRepository.close();
      mcpServersRepository.close();
      mcpStdioAccessRepository.close();
      personaRepository.close();
      platformAuditRepository.close();
      oidcProvidersRepository.close();
      appTagsRepository.close();
      labThemeRepository.close();
      labThemeCustomPresetRepository.close();
      labCommsRepository.close();
      labSidecarActivityRepository.close();
    }
  }

  async connect(): Promise<void> {

    const dbPath = await getDatabasePath()
    this.db = betterSqlite3(dbPath)
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = FULL');
    this.db.pragma('busy_timeout = 10000');

    await authRepository.bootstrap(this.db);
    await labEventsRepository.bootstrap(this.db);
    await labDomainEventCatalogRepository.bootstrap(this.db);
    await labRulesRepository.bootstrap(this.db);
    await labWorkflowsRepository.bootstrap(this.db);
    await labWorkflowRunsRepository.bootstrap(this.db);
    await labWorkflowSchedulesRepository.bootstrap(this.db);
    await labWorkflowMockSamplesRepository.bootstrap(this.db);
    await labWorkflowVersionsRepository.bootstrap(this.db);
    await labRequirementSweepRepository.bootstrap(this.db);
    await labWorkflowWebhooksRepository.bootstrap(this.db);
    await labWorkflowWebhookCapturesRepository.bootstrap(this.db);
    await labApprovalsRepository.bootstrap(this.db);
    await labVirtualBankRepository.bootstrap(this.db);
    await labLedgerRepository.bootstrap(this.db);
    await labCommsRepository.bootstrap(this.db);
    await aiProviderRepository.bootstrap(this.db);
    await appsRepository.bootstrap(this.db);
    await labIntegrationsRepository.bootstrap(this.db);
    await appTagsRepository.bootstrap(this.db);
    await labThemeRepository.bootstrap(this.db);
    await labSidecarActivityRepository.bootstrap(this.db);
    await commandRepository.bootstrap(this.db);
    await toolsRepository.bootstrap(this.db);
    await contextSettingsRepository.bootstrap(this.db);
    await userInstructionsRepository.bootstrap(this.db);
    await mcpServersRepository.bootstrap(this.db);
    await mcpStdioAccessRepository.bootstrap(this.db);
    await personaRepository.bootstrap(this.db);
    await platformAuditRepository.bootstrap(this.db);
    await oidcProvidersRepository.bootstrap(this.db);
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      await this.connect();
    }

    await authRepository.initialize();
    await labEventsRepository.initialize();
    domainEventCatalogRegistry.syncAll();
    await labRulesRepository.initialize();
    await labWorkflowsRepository.initialize();
    await labApprovalsRepository.initialize();
    await labLedgerRepository.initialize();
    seedDefaultLedgerJournalIfEmpty(1);
    await labCommsRepository.initialize();
    await aiProviderRepository.initialize();
    await appsRepository.initialize();
    await labIntegrationsRepository.initialize();
    await appTagsRepository.initialize();
    seedAllPlatformCatalogDemoIfMissing(this.db);
    await labThemeRepository.initialize();
    await commandRepository.initialize();
    await toolsRepository.initialize();
    await contextSettingsRepository.initialize();
    await userInstructionsRepository.initialize();
    await mcpServersRepository.initialize();
    await mcpStdioAccessRepository.initialize();
    await personaRepository.initialize();
    await platformAuditRepository.initialize();
    oidcProviderService.refreshCache();
  }
}

export const databaseManager = new DatabaseManager();
