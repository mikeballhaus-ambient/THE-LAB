import {
  createProvidersTable,
  createUserAiProviderConfigsTable,
  createIndexes,
  seedAIProviders,
  seedLmStudioProvider,
  AI_PROVIDER_IDS,
  AIProviderSQLStatementKeys,
  createAIProviderSQLStatements,
  AIProviderSQLStatementKey
} from './ai-provider-schema';
import {
  AiProvider,
  ProviderConfigBase,
  LLMProviderConfig,
  LLMChatProviderConfig,
  LLMEmbedProviderConfig
} from '../../../shared/types';
import type { Statement } from 'better-sqlite3';
import { Repository } from '../Repository';

export class AIProviderRepository extends Repository {
  private statements = {} as Record<AIProviderSQLStatementKey, Statement>;

  close(): void {
    this.statements = {} as Record<AIProviderSQLStatementKey, Statement>;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createProvidersTable);
      this.db.exec(createUserAiProviderConfigsTable);
      this.db.exec(createIndexes);

      // Seed default AI providers first (required for foreign key constraints)
      this.db.exec(seedAIProviders);
      this.db.exec(seedLmStudioProvider);

      this.statements = createAIProviderSQLStatements(this.db);

      // Get admin user ID for one-time default configs (never overwrite saved settings)
      const adminResult = this.db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('admin') as { id?: number } | undefined;
      const adminUserId = adminResult?.id ?? 1;

      if (typeof adminUserId === 'number') {
        this.ensureUserHasDefaultProviderConfigs(adminUserId);
      }

      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM user_ai_provider_configs').get() as { count?: number };
      const count = countResult?.count ?? 0;
      if (count === 0 && typeof adminUserId === 'number') {
        this.ensureUserHasDefaultProviderConfigs(adminUserId);
      }
    }
  }

  //
  // PROVIDERS
  //
  getProviderById(id: number): AiProvider | undefined {
    return this.statements[AIProviderSQLStatementKeys.provider_by_id].get(id) as AiProvider | undefined;
  }

  getProviderByName(name: string): AiProvider | undefined {
    return this.statements[AIProviderSQLStatementKeys.provider_by_name].get(name) as AiProvider | undefined;
  }

  getAllProviders(): AiProvider[] {
    return this.statements[AIProviderSQLStatementKeys.providers_all].all() as AiProvider[];
  }

  insertProvider(provider: AiProvider): void {
    this.db.transaction(() => {
      this.statements[AIProviderSQLStatementKeys.insert_provider].run(
        provider.name,
        provider.baseUrl,
        Number(provider.supportsApiKey ? 1 : 0)
      );
    })();
  }

  updateProvider(id: number, provider: AiProvider): void {
    this.db.transaction(() => {
      this.statements[AIProviderSQLStatementKeys.update_provider].run(
        provider.name,
        provider.baseUrl,
        Number(provider.supportsApiKey ? 1 : 0),
        new Date().toISOString(),
        id
      );
    })();
  }

  deleteProvider(id: number): void {
    this.db.transaction(() => {
      this.statements[AIProviderSQLStatementKeys.delete_provider].run(id);
    })();
  }

  //
  // USER AI PROVIDER CONFIGS (user_ai_provider_configs)
  //
  // Get structured provider config for a specific user
  getStructuredUserProviderConfig(userId: number): LLMProviderConfig | undefined {
    const chat = this.getUserProviderConfigById(userId, 'chat');
    const embed = this.getUserProviderConfigById(userId, 'embed');

    if (!chat || !embed) return undefined;

    return {
      chat: {
        id: chat.id,
        provider: chat.provider,
        providerId: chat.providerId,
        providerType: chat.providerType,
        model: chat.model,
        apiKey: chat.apiKey,
        baseUrl: chat.baseUrl,
        maxContext: (parseInt(chat.maxContext) || 32768).toString()
      } as LLMChatProviderConfig,
      embed: {
        id: embed.id,
        provider: embed.provider,
        providerId: embed.providerId,
        providerType: embed.providerType,
        model: embed.model,
        apiKey: embed.apiKey,
        baseUrl: embed.baseUrl,
        maxContext: (parseInt(embed.maxContext) || 32768).toString()
      } as LLMEmbedProviderConfig
    } as LLMProviderConfig;
  }

  // Get provider config by user ID and type
  getUserProviderConfigById(userId: number, providerType: 'chat' | 'embed'): ProviderConfigBase | undefined {
    return this.statements[AIProviderSQLStatementKeys.user_ai_provider_config_by_userid_type].get(
      userId,
      providerType,
    ) as ProviderConfigBase | undefined;
  }

  // Update user's provider config
  updateUserProviderConfig(
    userId: number,
    providerId: number,
    providerType: 'chat' | 'embed',
    config: ProviderConfigBase
  ): void {
    this.db.transaction(() => {
      this.statements[AIProviderSQLStatementKeys.insert_user_ai_provider_config].run(
        userId,
        providerId,
        providerType,
        config.model,
        config.apiKey || null,
        config.baseUrl,
        Number(config.maxContext) || 32768,
      );
    })();
  }

  // Ensure user has default provider configs if they don't already have any
  ensureUserHasDefaultProviderConfigs(userId: number): void {
    const existingChat = this.getUserProviderConfigById(userId, 'chat');
    const existingEmbed = this.getUserProviderConfigById(userId, 'embed');

    if (!existingChat) {
      this.db.transaction(() => {
        // Insert default chat config
        this.statements[AIProviderSQLStatementKeys.insert_user_ai_provider_config].run(
          userId,
          AI_PROVIDER_IDS.LM_STUDIO,
          'chat',
          'qwen/qwen3.5-9b',
          '',
          'http://127.0.0.1:1234',
          120320
        );
      })();
    }

    if (!existingEmbed) {
      this.db.transaction(() => {
        // Insert default embed config
        this.statements[AIProviderSQLStatementKeys.insert_user_ai_provider_config].run(
          userId,
          AI_PROVIDER_IDS.LM_STUDIO,
          'embed',
          'text-embedding-mxbai-embed-large-v1',
          '',
          'http://127.0.0.1:1234',
          1024
        );
      })();
    }
  }

  // Get all user provider configs
  getAllUserProviderConfigs(): ProviderConfigBase[] {
    return this.statements[AIProviderSQLStatementKeys.user_ai_provider_configs].all() as ProviderConfigBase[];
  }

  // Get configs for specific user
  getProviderConfigsByUserId(userId: number): ProviderConfigBase[] {
    return this.statements[AIProviderSQLStatementKeys.user_ai_provider_configs_by_userid].all(
      userId,
    ) as ProviderConfigBase[];
  }

  // Delete user's provider configs
  deleteUserProviderConfigs(userId: number): void {
    this.db.transaction(() => {
      const configs = this.statements[AIProviderSQLStatementKeys.user_ai_provider_configs_by_userid].all(
        userId,
      ) as ProviderConfigBase[];
      for (const config of configs) {
        this.statements[AIProviderSQLStatementKeys.delete_user_ai_provider_config].run(config.id);
      }
    })();
  }

}

export const aiProviderRepository = new AIProviderRepository();
