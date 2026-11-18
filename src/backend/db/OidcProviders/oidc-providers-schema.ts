export const GOOGLE_OIDC_PROVIDER_ID = 'google';

export const createLabOidcProvidersTable = `
CREATE TABLE IF NOT EXISTS lab_oidc_providers (
  provider_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
  client_id TEXT,
  client_secret TEXT,
  redirect_uri TEXT,
  extras_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const createLabOidcProvidersIndex = `
CREATE INDEX IF NOT EXISTS idx_lab_oidc_providers_enabled
  ON lab_oidc_providers (enabled);
`;

export const seedLabOidcProviderRows = `
INSERT OR IGNORE INTO lab_oidc_providers (provider_id, enabled, client_id, client_secret, redirect_uri, extras_json)
VALUES
  ('google', 0, NULL, NULL, NULL, NULL),
  ('github', 0, NULL, NULL, NULL, NULL),
  ('microsoft-entra', 0, NULL, NULL, NULL, NULL);
`;

