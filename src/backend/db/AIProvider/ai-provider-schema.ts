import type { Database, Statement } from 'better-sqlite3';

/** Registry ids in `ai_providers` (stable for seeds and default user configs). */
export const AI_PROVIDER_IDS = {
  OLLAMA: 1,
  OPENAI: 2,
  LM_STUDIO: 3,
} as const;

export const createProvidersTable = `
  CREATE TABLE IF NOT EXISTS ai_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    baseUrl TEXT NOT NULL,
    supportsApiKey INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createUserAiProviderConfigsTable = `
  CREATE TABLE IF NOT EXISTS user_ai_provider_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userid INTEGER NOT NULL,
    providerId INTEGER NOT NULL,
    providerType TEXT NOT NULL DEFAULT 'chat' CHECK(providerType IN ('chat', 'embed')),
    model TEXT NOT NULL,
    apiKey TEXT,
    baseUrl TEXT NOT NULL,
    maxContext INTEGER NOT NULL DEFAULT 32768,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (providerId) REFERENCES ai_providers(id) ON DELETE RESTRICT,
    UNIQUE (userid, providerType)
  );
`;

export const createIndexes = `
  -- Providers
  CREATE INDEX IF NOT EXISTS idx_ai_providers_name ON ai_providers(name);

  -- User AI Provider Configs
  CREATE INDEX IF NOT EXISTS idx_user_ai_provider_configs_userid ON user_ai_provider_configs(userid);
  CREATE INDEX IF NOT EXISTS idx_user_ai_provider_configs_providerId ON user_ai_provider_configs(providerId);
  CREATE INDEX IF NOT EXISTS idx_user_ai_provider_configs_model ON user_ai_provider_configs(model);
`;

export const seedAIProviders = `
  INSERT OR IGNORE INTO ai_providers (id, name, baseUrl, supportsApiKey)
  VALUES
    (${AI_PROVIDER_IDS.OLLAMA}, 'Ollama', 'http://127.0.0.1:11434', 0),
    (${AI_PROVIDER_IDS.OPENAI}, 'OpenAI', 'https://api.openai.com/v1', 1),
    (${AI_PROVIDER_IDS.LM_STUDIO}, 'LM Studio', 'http://10.0.0.216:1234', 1);
`;

/** Backfill for DBs created before LM Studio was added to the seed. */
export const seedLmStudioProvider = `
  INSERT OR IGNORE INTO ai_providers (id, name, baseUrl, supportsApiKey)
  VALUES (${AI_PROVIDER_IDS.LM_STUDIO}, 'LM Studio', 'http://10.0.0.216:1234', 1);
`;

export const seedAIProviderConfigs = `
  -- Default configs will be inserted dynamically via repository methods
  -- This placeholder ensures the table exists even without initial data
`;

const LM_STUDIO_DEFAULT_BASE = 'http://10.0.0.216:1234';

export const seedUserAiProviderConfigsForAdmin = (adminUserId: number) => `
  INSERT OR REPLACE INTO user_ai_provider_configs
    (userid, providerId, providerType, model, apiKey, baseUrl, maxContext)
  VALUES
    (${adminUserId}, ${AI_PROVIDER_IDS.LM_STUDIO}, 'embed', 'text-embedding-mxbai-embed-large-v1', '', '${LM_STUDIO_DEFAULT_BASE}', 1024),
    (${adminUserId}, ${AI_PROVIDER_IDS.LM_STUDIO}, 'chat', 'qwen/qwen3.5-9b', '', '${LM_STUDIO_DEFAULT_BASE}', 75366);
`;

export const createUserAiProviderConfigsDefault = (userId: number) => `
  INSERT OR REPLACE INTO user_ai_provider_configs
    (userid, providerId, providerType, model, apiKey, baseUrl, maxContext)
  VALUES
    (${userId}, ${AI_PROVIDER_IDS.LM_STUDIO}, 'embed', 'text-embedding-mxbai-embed-large-v1', '', '${LM_STUDIO_DEFAULT_BASE}', 1024),
    (${userId}, ${AI_PROVIDER_IDS.LM_STUDIO}, 'chat', 'qwen/qwen3.5-9b', '', '${LM_STUDIO_DEFAULT_BASE}', 75366);
`;


export const AIProviderSQLStatementKeys = {
    // Providers (ai_providers) - unchanged
    providers: 'providers',
    provider_by_id: 'provider_by_id',
    provider_by_name: 'provider_by_name',
    providers_all: 'providers_all',

    insert_provider: 'insert_provider',
    update_provider: 'update_provider',
    delete_provider: 'delete_provider',

    // User AI Provider Configs (user_ai_provider_configs) - UPDATED
    user_ai_provider_configs: 'user_ai_provider_configs',
    user_ai_provider_config_by_id: 'user_ai_provider_config_by_id',
    user_ai_provider_configs_by_userid: 'user_ai_provider_configs_by_userid',
    user_ai_provider_config_by_userid_type: 'user_ai_provider_config_by_userid_type',

    insert_user_ai_provider_config: 'insert_user_ai_provider_config',
    update_user_ai_provider_config: 'update_user_ai_provider_config',
    delete_user_ai_provider_config: 'delete_user_ai_provider_config',
} as const;

export type AIProviderSQLStatementKey = keyof typeof AIProviderSQLStatementKeys

export const createAIProviderSQLStatements = (
    db: Database
): Record<AIProviderSQLStatementKey, Statement> => {
    const q = (sql: string) => db.prepare(sql)

    return {
        //
        // PROVIDERS (ai_providers) - unchanged
        //
        [AIProviderSQLStatementKeys.providers]: q(`
            SELECT * FROM ai_providers WHERE id = ?
        `),

        [AIProviderSQLStatementKeys.provider_by_id]: q(`
            SELECT * FROM ai_providers WHERE id = ?
        `),

        [AIProviderSQLStatementKeys.provider_by_name]: q(`
            SELECT * FROM ai_providers WHERE name = ?
        `),

        [AIProviderSQLStatementKeys.providers_all]: q(`
            SELECT * FROM ai_providers ORDER BY id ASC
        `),

        [AIProviderSQLStatementKeys.insert_provider]: q(`
            INSERT INTO ai_providers (name, baseUrl, supportsApiKey)
            VALUES (?, ?, ?)
        `),

        [AIProviderSQLStatementKeys.update_provider]: q(`
            UPDATE ai_providers
            SET name = ?, baseUrl = ?, supportsApiKey = ?, updated_at = ?
            WHERE id = ?
        `),

        [AIProviderSQLStatementKeys.delete_provider]: q(`
            DELETE FROM ai_providers WHERE id = ?
        `),

        //
        // USER AI PROVIDER CONFIGS (user_ai_provider_configs) - UPDATED
        //
        [AIProviderSQLStatementKeys.user_ai_provider_configs]: q(`
            SELECT u.id, u.userid, u.providerId, u.providerType, u.model, u.apiKey, u.baseUrl, u.maxContext, u.created_at, u.updated_at, p.name as provider
            FROM user_ai_provider_configs u
            INNER JOIN ai_providers p ON u.providerId = p.id
            ORDER BY u.userid ASC, u.providerType ASC
        `),

        [AIProviderSQLStatementKeys.user_ai_provider_config_by_id]: q(`
            SELECT u.id, u.userid, u.providerId, u.providerType, u.model, u.apiKey, u.baseUrl, u.maxContext, u.created_at, u.updated_at, p.name as provider
            FROM user_ai_provider_configs u
            INNER JOIN ai_providers p ON u.providerId = p.id
            WHERE u.id = ?
        `),

        [AIProviderSQLStatementKeys.user_ai_provider_configs_by_userid]: q(`
            SELECT u.id, u.userid, u.providerId, u.providerType, u.model, u.apiKey, u.baseUrl, u.maxContext, u.created_at, u.updated_at, p.name as provider
            FROM user_ai_provider_configs u
            INNER JOIN ai_providers p ON u.providerId = p.id
            WHERE u.userid = ?
            ORDER BY u.providerType ASC
        `),

        [AIProviderSQLStatementKeys.user_ai_provider_config_by_userid_type]: q(`
            SELECT u.id, u.userid, u.providerId, u.providerType, u.model, u.apiKey, u.baseUrl, u.maxContext, u.created_at, u.updated_at, p.name as provider
            FROM user_ai_provider_configs u
            INNER JOIN ai_providers p ON u.providerId = p.id
            WHERE u.userid = ? AND u.providerType = ?
        `),

        [AIProviderSQLStatementKeys.insert_user_ai_provider_config]: q(`
            INSERT OR REPLACE INTO user_ai_provider_configs
                (userid, providerId, providerType, model, apiKey, baseUrl, maxContext)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `),

        [AIProviderSQLStatementKeys.update_user_ai_provider_config]: q(`
            UPDATE user_ai_provider_configs
            SET userid = ?, providerId = ?, providerType = ?, model = ?, apiKey = ?, baseUrl = ?, maxContext = ?, updated_at = ?
            WHERE id = ?
        `),

        [AIProviderSQLStatementKeys.delete_user_ai_provider_config]: q(`
            DELETE FROM user_ai_provider_configs WHERE id = ?
        `),
    }
}
