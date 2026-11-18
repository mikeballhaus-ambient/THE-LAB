import { labDB, type SessionRecord } from "../../types/lab-db";
import { ChatPersona, ChatSessionRecord } from '../../types';
import {
  cloneAppViewLayoutPersistence,
  type AppViewLayoutPersistence,
} from '../../types/app-view-layout';
import {
  cloneLabWorkflowDesignerLayoutPersistence,
  type LabWorkflowDesignerLayoutPersistence,
} from '../../types/lab-workflow-designer-layout';

export class SessionManager {
  private readonly SESSION_TIMEOUT_MS = 90 * 24 * 60 * 60 * 1000;

  /**
   * The `sessionState` table, injectable for tests.
   *
   * Defaults to the real Dexie table. The concurrency behaviour in `atomicMutate` is only
   * meaningfully testable against a controllable table, so this seam exists rather than mocking
   * the whole `labDB` module.
   */
  constructor(
    private readonly table: {
      get(id: string): Promise<SessionRecord | undefined>;
      add(row: SessionRecord): Promise<unknown>;
      put(row: SessionRecord): Promise<unknown>;
      where(field: string): {
        equals(value: string): { modify(cb: (row: SessionRecord) => void): Promise<number> };
      };
    } = labDB.sessionState,
    private readonly runTransaction: <T>(fn: () => Promise<T>) => Promise<T> = (fn) =>
      labDB.transaction('rw', labDB.sessionState, fn),
  ) {}

  async init() {
    /*
     * `add()` rather than `put()`: it fails on an existing primary key instead of overwriting.
     * A concurrent writer can create the record between the `get()` and the insert, and a blind
     * `put()` here would replace whatever it had already stored.
     */
    const existing = await this.table.get('sessions');
    if (!existing) {
      try {
        await this.table.add({ id: 'sessions', sessions: [] });
      } catch {
        // Already created concurrently — nothing to do.
      }
    }
  }

  private async load(): Promise<SessionRecord> {
    const record = await this.table.get('sessions');
    return record ?? { id: 'sessions', sessions: [] };
  }

  /**
   * Atomic read-modify-write of the single `sessions` record.
   *
   * **Every mutator must go through this.** The record holds ~15 independent fields that several
   * parts of the shell update concurrently (`activeSessionId`, layout ratios, view flags,
   * per-app state). The previous `load()` → mutate → `put(wholeRecord)` pattern is a
   * lost-update race: a caller that took its snapshot *before* another write landed would re-put
   * the whole record without that change, silently discarding it. That is what erased
   * `appState` after a successful save.
   *
   * `modify()` re-reads inside the write transaction and Dexie serialises write transactions on
   * the table, so concurrent updates compose instead of clobbering each other.
   *
   * The record is created on demand: `init()` is not guaranteed to have run for a caller, and
   * `modify()` on a missing row would otherwise silently do nothing.
   */
  private async atomicMutate(mutator: (record: SessionRecord) => void): Promise<SessionRecord> {
    return this.runTransaction(async () => {
      let updated: SessionRecord | null = null;
      const count = await this.table
        .where('id')
        .equals('sessions')
        .modify((record) => {
          mutator(record);
          updated = record;
        });

      if (count === 0) {
        const fresh: SessionRecord = { id: 'sessions', sessions: [] };
        mutator(fresh);
        await this.table.put(fresh);
        return fresh;
      }
      return updated ?? (await this.load());
    });
  }

  async getActiveSessions(): Promise<ChatSessionRecord[]> {
    const data = await this.load();
    return data.sessions;
  }

  async getActiveSessionId(): Promise<string | null> {
    const data = await this.load();
    return data.activeSessionId ?? null;
  }

  async createSession(title?: string, persona?: ChatPersona): Promise<ChatSessionRecord> {
    const sessionId = crypto.randomUUID?.() || this.fallbackUuid();

    return this.createNewSession(sessionId, title, persona);
  }

  async createNewSession(sessionId: string, title?: string, persona?: ChatPersona): Promise<ChatSessionRecord> {
    const now = Date.now();

    const session: ChatSessionRecord = {
      sessionId,
      title: title ? this.truncateToWords(title, 4) : 'New Chat',
      createdAt: now,
      lastActivity: now,
      contextUsed: 0,
      persona: persona ?? 'Chat',
      files: []
    };

    await this.atomicMutate((record) => {
      record.sessions.push(session);
      record.activeSessionId = sessionId;
    });
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<ChatSessionRecord>) {
    let result: ChatSessionRecord | null = null;
    await this.atomicMutate((record) => {
      const index = record.sessions.findIndex((s) => s.sessionId === sessionId);
      if (index === -1) {
        return;
      }
      const merged: ChatSessionRecord = {
        ...record.sessions[index],
        ...updates,
        lastActivity: updates.lastActivity ?? Date.now(),
      };
      record.sessions[index] = merged;
      result = merged;
    });
    return result;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    let deleted = false;
    await this.atomicMutate((record) => {
      const index = record.sessions.findIndex((s) => s.sessionId === sessionId);
      if (index === -1) {
        return;
      }
      record.sessions.splice(index, 1);
      if (record.activeSessionId === sessionId) {
        record.activeSessionId = record.sessions[0]?.sessionId;
      }
      deleted = true;
    });
    return deleted;
  }

  async setActiveSession(sessionId: string) {
    await this.atomicMutate((record) => {
      record.activeSessionId = sessionId;
    });
  }

  async restoreActiveSession(): Promise<string | undefined> {
    const data = await this.load();
    const valid = data.sessions.find(s => s.sessionId === data.activeSessionId);
    return valid ? data.activeSessionId : undefined;
  }

  async setLabView(isLabAssistantView: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.isLabAssistantView = isLabAssistantView;
    });
  }

  async isLabAssistantView(): Promise<boolean> {
    const data = await this.load();
    return data.isLabAssistantView ?? false;
  }

  /** @deprecated Chat preview removed in rm-57 — use Lab Sidecar. Clears legacy Dexie flag. */
  async setLabAssistantPreview(isLabAssistantPreview: boolean): Promise<void> {
    void isLabAssistantPreview;
    await this.atomicMutate((record) => {
      delete record.labAssistantPreview;
    });
  }

  /** @deprecated Always false — Lab Sidecar replaced chat preview (rm-57). */
  async isLabAssistantPreview(): Promise<boolean> {
    return false;
  }

  async setStreamingEnabled(isStreamingEnabled: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.streamingEnabled = isStreamingEnabled;
    });
  }

  async getStreamingEnabled(): Promise<boolean> {
    const data = await this.load();
    return data.streamingEnabled ?? false;
  }

  async setDeveloperMode(isDeveloperMode: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.isDeveloperMode = isDeveloperMode;
    });
  }

  async getDeveloperMode(): Promise<boolean> {
    const data = await this.load();
    return data.isDeveloperMode ?? false;
  }

  async setShowServerApps(showServerApps: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.showServerApps = showServerApps;
    });
  }

  async getShowServerApps(): Promise<boolean> {
    const data = await this.load();
    return data.showServerApps ?? false;
  }

  async setShowDependencyApps(showDependencyApps: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.showDependencyApps = showDependencyApps;
    });
  }

  async getShowDependencyApps(): Promise<boolean> {
    const data = await this.load();
    return data.showDependencyApps ?? false;
  }

  async setLabSidecarExpanded(expanded: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labSidecarExpanded = expanded;
    });
  }

  async getLabSidecarExpanded(): Promise<boolean> {
    const data = await this.load();
    return data.labSidecarExpanded ?? false;
  }

  async setLabSidecarShowToolResults(show: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labSidecarShowToolResults = show;
    });
  }

  async getLabSidecarShowToolResults(): Promise<boolean> {
    const data = await this.load();
    return data.labSidecarShowToolResults ?? false;
  }

  async setLabCatalogSidebarExpanded(expanded: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labCatalogSidebarExpanded = expanded;
    });
  }

  async getLabCatalogSidebarExpanded(): Promise<boolean> {
    const data = await this.load();
    return data.labCatalogSidebarExpanded ?? true;
  }

  async setLabRunningAppsRailExpanded(expanded: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labRunningAppsRailExpanded = expanded;
    });
  }

  async getLabRunningAppsRailExpanded(): Promise<boolean> {
    const data = await this.load();
    return data.labRunningAppsRailExpanded ?? true;
  }

  async getLabGameSidecarAutoOpen(): Promise<boolean> {
    const data = await this.load();
    return data.labGameSidecarAutoOpen ?? true;
  }

  async setLabGameSidecarAutoOpen(enabled: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labGameSidecarAutoOpen = enabled;
    });
  }

  async getLabGameBanterDisabled(): Promise<boolean> {
    const data = await this.load();
    return data.labGameBanterDisabled ?? false;
  }

  async setLabGameBanterDisabled(disabled: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labGameBanterDisabled = disabled;
    });
  }

  async getLabGameSidecarAutoOpenHintShown(): Promise<boolean> {
    const data = await this.load();
    return data.labGameSidecarAutoOpenHintShown ?? false;
  }

  async setLabGameSidecarAutoOpenHintShown(shown: boolean): Promise<void> {
    await this.atomicMutate((record) => {
      record.labGameSidecarAutoOpenHintShown = shown;
    });
  }

  async setAppViewLayoutRatios(persistence: AppViewLayoutPersistence): Promise<void> {
    const clone = cloneAppViewLayoutPersistence(persistence);
    await this.atomicMutate((record) => {
      record.appViewLayout = clone;
    });
  }

  async getAppViewLayoutRatios(): Promise<AppViewLayoutPersistence | undefined> {
    const data = await this.load();
    return data.appViewLayout;
  }

  async setLabWorkflowDesignerLayout(persistence: LabWorkflowDesignerLayoutPersistence): Promise<void> {
    const clone = cloneLabWorkflowDesignerLayoutPersistence(persistence);
    await this.atomicMutate((record) => {
      record.labWorkflowDesignerLayout = clone;
    });
  }

  async getLabWorkflowDesignerLayout(): Promise<LabWorkflowDesignerLayoutPersistence | undefined> {
    const data = await this.load();
    return data.labWorkflowDesignerLayout;
  }

  /**
   * Read the opaque state blob an app saved for one **user**.
   *
   * Scoped by user id because the session record is per browser, not per login — a shared
   * machine would otherwise carry one person's preferences into the next session.
   *
   * Returns `undefined` when nothing is stored. The **caller owns the shape** — this is a generic
   * escape hatch so apps do not each need their own Dexie database, so it deliberately does not
   * validate or migrate the value.
   */
  async getAppState(appId: string, userId: number): Promise<unknown> {
    const data = await this.load();
    return data.appState?.[appId]?.[userId];
  }

  /**
   * Merge-write one (app, user) state without disturbing any other entry.
   *
   * Passing `null`/`undefined` removes that user's key, and the app key itself is dropped once
   * its last user entry is gone — so signing out of an app does not leave empty objects behind.
   */
  async setAppState(appId: string, userId: number, value: unknown): Promise<void> {
    /*
     * Serialise **before** touching the database.
     *
     * IndexedDB uses structured clone, which cannot clone a Vue reactive proxy: `put()` throws
     * `DataCloneError`. The JSON round-trip strips the proxy and guarantees plain data, and also
     * drops functions/symbols (correct for UI state).
     */
    let serialised: unknown = null;
    if (value !== null && value !== undefined) {
      try {
        serialised = JSON.parse(JSON.stringify(value)) as unknown;
      } catch {
        throw new Error(`appState for ${appId} is not serialisable`);
      }
    }

    // Atomic read-modify-write via `atomicMutate` — see that method for why `load()`/`put()` is
    // unsafe on this record.
    await this.atomicMutate((record) => {
      const next: Record<string, Record<number, unknown>> = { ...(record.appState ?? {}) };
      const current: Record<number, unknown> = { ...(next[appId] ?? {}) };

      if (serialised === null) {
        delete current[userId];
      } else {
        current[userId] = serialised;
      }

      // Drop the app key once its last user entry is gone, so sign-out leaves no empties.
      if (Object.keys(current).length === 0) {
        delete next[appId];
      } else {
        next[appId] = current;
      }

      record.appState = next;
    });
  }

  async cleanupStaleSessions(): Promise<string[]> {
    const now = Date.now();
    const deleted: string[] = [];

    await this.atomicMutate((record) => {
      record.sessions = record.sessions.filter((s) => {
        const stale = now - s.lastActivity > this.SESSION_TIMEOUT_MS;
        if (stale) deleted.push(s.sessionId);
        return !stale;
      });
    });

    return deleted;
  }

  private fallbackUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private truncateToWords(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;

    let truncated = words.slice(0, maxWords).join(' ');
    if (truncated.length > 25) truncated = truncated.substring(0, 22) + '...';
    return truncated || 'New Chat';
  }
}
