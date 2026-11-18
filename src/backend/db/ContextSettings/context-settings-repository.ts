import {
  createContextSettingsTable,
  seedContextSettings,
  ContextSettingsSQLStatementKeys,
  createContextSettingsSQLStatements,
  ContextSettingsSQLStatementKey
} from './context-settings-schema';
import { IContextSettings } from '../../../shared/types/context-settings';
import type { Statement } from 'better-sqlite3';
import { Repository } from '../Repository';

interface ContextSettingsDbRow {
  id: number;
  userid: number;
  enable_auto_summarization: number;
  trigger_summarization_percent: number;
  normal_min_value: number;
  normal_max_value: number;
  normal_color_class: string;
  warning_min_value: number;
  warning_max_value: number;
  warning_color_class: string;
  critical_min_value: number;
  critical_max_value: number;
  critical_color_class: string;
}

export class ContextSettingsRepository extends Repository {
  private statements = {} as Record<ContextSettingsSQLStatementKey, Statement>;

  close(): void {
    this.statements = {} as Record<ContextSettingsSQLStatementKey, Statement>;
  }

  async initialize(): Promise<void> {
    if (this.db) {
      this.db.exec(createContextSettingsTable);
      this.statements = createContextSettingsSQLStatements(this.db);
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM user_context_settings').get() as {
        count: number;
      };
      const count = countResult.count;
      if (count === 0 && typeof count === 'number') {
        this.db.exec(seedContextSettings);
      }
    }
  }

  //
  // QUERY METHODS
  //

  /**
   * Get the single configuration entry for a specific user
   * @param userId - Optional user ID to filter by (defaults to all)
   * @returns The context settings object or undefined if not found
   */
  get(userId?: number): IContextSettings | undefined {
    const row = this.statements[ContextSettingsSQLStatementKeys.SELECT_ALL].get(userId) as
      | ContextSettingsDbRow
      | undefined;
    if (!row) return undefined;
    return this.mapRowToContextSettings(row);
  }

  /**
   * Get all user context settings
   * @returns Array of all context settings
   */
  getAll(): IContextSettings[] {
    const rows = this.statements[ContextSettingsSQLStatementKeys.SELECT_ALL].all() as ContextSettingsDbRow[];
    return rows.map(row => this.mapRowToContextSettings(row));
  }

  /**
   * Get context settings by user ID (alias for get)
   * @param userId - User ID to filter by
   * @returns The context settings object or undefined if not found
   */
  getByUserId(userId: number): IContextSettings | undefined {
    return this.get(userId);
  }

  /**
   * Delete the configuration for a specific user
   * @param userId - User ID to delete
   */
  deleteByUserId(userId: number): void {
    this.db.transaction(() => {
      this.statements[ContextSettingsSQLStatementKeys.DELETE].run(userId);
    })();
  }

  //
  // CRUD OPERATIONS
  //

  /**
   * Update the existing configuration for a specific user
   * @param userId - User ID to update
   * @param contextSettings - The context settings object to update
   */
  update(userId: number, contextSettings: IContextSettings): void {
    this.db.transaction(() => {
      this.statements[ContextSettingsSQLStatementKeys.UPDATE_ALL].run(
        contextSettings.enableAutoSummarization ? 1 : 0,
        contextSettings.triggerSummarizationPercent ?? 0,
        contextSettings.normal.minValue,
        contextSettings.normal.maxValue,
        contextSettings.normal.colorClass,
        contextSettings.warning.minValue,
        contextSettings.warning.maxValue,
        contextSettings.warning.colorClass,
        contextSettings.critical.minValue,
        contextSettings.critical.maxValue,
        contextSettings.critical.colorClass,
        new Date().toISOString(),
        userId,
      );
    })();
  }

  ensureUserDefaultSettings(userId: number): void {
    const existing = this.statements[ContextSettingsSQLStatementKeys.SELECT_ALL].get(userId) as
      | ContextSettingsDbRow
      | undefined;
    if (!existing) {
      try {
        this.db.transaction(() => {
          // Insert default settings for this user
          this.statements[ContextSettingsSQLStatementKeys.INSERT_DEFAULT].run(
            userId,
            1,  // enable_auto_summarization
            100,  // trigger_summarization_percent
            0,   // normal_min_value
            75,  // normal_max_value
            'emerald-500',  // normal_color_class
            76,  // warning_min_value
            90,  // warning_max_value
            'amber-500',  // warning_color_class
            91,  // critical_min_value
            100, // critical_max_value
            'red-500'
          );
        })();
      } catch (err) {
        console.log(`error inserting new user context settings: ${JSON.stringify(err)}`)
      }
    }
  }

  /**
   * Delete the configuration
   */
  delete(): void {
    this.db.transaction(() => {
      this.statements[ContextSettingsSQLStatementKeys.DELETE].run();
    })();
  }

  //
  // PRIVATE HELPERS
  //

  /**
   * Helper method to deserialize a database row into an IContextSettings object
   * @param row - Raw row from database
   * @returns IContextSettings object with properly deserialized fields
   */
  private mapRowToContextSettings(row: ContextSettingsDbRow): IContextSettings {
    return {
      id: row.id,
      userId: row.userid,
      enableAutoSummarization: row.enable_auto_summarization === 1,
      triggerSummarizationPercent: row.trigger_summarization_percent,
      normal: {
        minValue: row.normal_min_value,
        maxValue: row.normal_max_value,
        colorClass: row.normal_color_class
      },
      warning: {
        minValue: row.warning_min_value,
        maxValue: row.warning_max_value,
        colorClass: row.warning_color_class
      },
      critical: {
        minValue: row.critical_min_value,
        maxValue: row.critical_max_value,
        colorClass: row.critical_color_class
      }
    };
  }
}

export const contextSettingsRepository = new ContextSettingsRepository();
