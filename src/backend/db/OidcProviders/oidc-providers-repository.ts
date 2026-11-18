import { Repository } from '../Repository';
import {
  createLabOidcProvidersIndex,
  createLabOidcProvidersTable,
  seedLabOidcProviderRows,
} from './oidc-providers-schema';
import { seedOidcProvidersFromEnv } from './seed-oidc-providers-from-env';

export interface LabOidcProviderRow {
  providerId: string;
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  extrasJson: string | null;
  createdAt: string;
  updatedAt: string;
}

type DbRow = {
  provider_id: string;
  enabled: number;
  client_id: string | null;
  client_secret: string | null;
  redirect_uri: string | null;
  extras_json: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: DbRow): LabOidcProviderRow {
  return {
    providerId: row.provider_id,
    enabled: row.enabled === 1,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    redirectUri: row.redirect_uri,
    extrasJson: row.extras_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class OidcProvidersRepository extends Repository {
  close(): void {
    /* prepared per call */
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      return;
    }
    this.db.exec(createLabOidcProvidersTable);
    this.db.exec(createLabOidcProvidersIndex);
    this.db.exec(seedLabOidcProviderRows);
    seedOidcProvidersFromEnv();
  }

  deleteByProviderId(providerId: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM lab_oidc_providers WHERE provider_id = ?`)
      .run(providerId);
    return result.changes > 0;
  }

  insertEmpty(providerId: string): LabOidcProviderRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO lab_oidc_providers (provider_id, enabled, client_id, client_secret, redirect_uri, extras_json, updated_at)
         VALUES (?, 0, NULL, NULL, NULL, NULL, ?)`,
      )
      .run(providerId, now);
    const row = this.getByProviderId(providerId);
    if (!row) {
      throw new Error(`Failed to create OIDC provider ${providerId}`);
    }
    return row;
  }

  getAll(): LabOidcProviderRow[] {
    const rows = this.db
      .prepare(
        `SELECT provider_id, enabled, client_id, client_secret, redirect_uri, extras_json, created_at, updated_at
         FROM lab_oidc_providers ORDER BY provider_id`,
      )
      .all() as DbRow[];
    return rows.map(mapRow);
  }

  getByProviderId(providerId: string): LabOidcProviderRow | undefined {
    const row = this.db
      .prepare(
        `SELECT provider_id, enabled, client_id, client_secret, redirect_uri, extras_json, created_at, updated_at
         FROM lab_oidc_providers WHERE provider_id = ?`,
      )
      .get(providerId) as DbRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  upsert(input: {
    providerId: string;
    enabled: boolean;
    clientId: string | null;
    clientSecret: string | null;
    redirectUri: string | null;
    extrasJson?: string | null;
  }): LabOidcProviderRow {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO lab_oidc_providers (provider_id, enabled, client_id, client_secret, redirect_uri, extras_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(provider_id) DO UPDATE SET
           enabled = excluded.enabled,
           client_id = excluded.client_id,
           client_secret = COALESCE(excluded.client_secret, lab_oidc_providers.client_secret),
           redirect_uri = excluded.redirect_uri,
           extras_json = COALESCE(excluded.extras_json, lab_oidc_providers.extras_json),
           updated_at = excluded.updated_at`,
      )
      .run(
        input.providerId,
        input.enabled ? 1 : 0,
        input.clientId,
        input.clientSecret,
        input.redirectUri,
        input.extrasJson ?? null,
        now,
      );
    const updated = this.getByProviderId(input.providerId);
    if (!updated) {
      throw new Error(`Failed to upsert OIDC provider ${input.providerId}`);
    }
    return updated;
  }
}

export const oidcProvidersRepository = new OidcProvidersRepository();
