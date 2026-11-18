import Dexie, { Table } from 'dexie';
import { ChatSessionRecord, UIChatMessage, TodoList } from './index';
import type { AppViewLayoutPersistence } from './app-view-layout';
import type { LabWorkflowDesignerLayoutPersistence } from './lab-workflow-designer-layout';

export interface AppPinRecord {
  id: string; // always 'app-pins'
  orderedAppIds: string[];
}

export interface SessionDataRecord<T> {
  sessionId: string;
  items: T[];
}

export interface SessionRecord {
  id: string; // always "sessions"
  sessions: ChatSessionRecord[];
  activeSessionId?: string;
  isLabAssistantView?: boolean;
  streamingEnabled?: boolean;
  test?: boolean;
  labAssistantPreview?: boolean;
  isDeveloperMode?: boolean;
  showServerApps?: boolean;
  showDependencyApps?: boolean;
  /** Lab Sidecar panel expanded (rm-57) */
  labSidecarExpanded?: boolean;
  /** Lab Sidecar composer — show grouped tool results in the transcript (default false). */
  labSidecarShowToolResults?: boolean;
  /** Compact app catalog sidebar expanded while apps workspace is open */
  labCatalogSidebarExpanded?: boolean;
  /** Running-apps rail (parked apps) expanded beside the app catalog */
  labRunningAppsRailExpanded?: boolean;
  /** Vs–Lab Assistant: auto-open Sidecar when a catalog game app launches (default true). */
  labGameSidecarAutoOpen?: boolean;
  /** Vs–Lab Assistant: disable LLM game banter in Sidecar (default false). */
  labGameBanterDisabled?: boolean;
  /** One-time toast after first auto-open has been shown. */
  labGameSidecarAutoOpenHintShown?: boolean;
  /** Split ↔ and Form designer gutter % only */
  appViewLayout?: AppViewLayoutPersistence;
  /** Workflow designer palette | canvas | sidebar % widths */
  labWorkflowDesignerLayout?: LabWorkflowDesignerLayoutPersistence;
  /**
   * Per-app, **per-user** persisted UI state.
   *
   * Shape: `{ [appId]: { [userId]: <opaque app-owned value> } }`.
   *
   * The outer key is the registry app id; the inner key is the platform `users.id`. The user
   * dimension is essential: this record is per **browser**, not per login, so without it one
   * person's saved settings would appear for the next user who signs in on the same device.
   *
   * Values are `unknown` on purpose — **the owning app is responsible for the shape and for
   * serialising/validating what it reads back**. Consumers must treat a missing or malformed
   * entry as "no saved state" rather than assuming their current schema.
   *
   * Keep entries small and UI-scoped — this lives in the session record, not an app data store.
   * Entries are written per (app, user); clearing both dimensions removes the app's key.
   */
  appState?: Record<string, Record<number, unknown>>;
}

export class LabDB extends Dexie {
  chatMessages!: Table<SessionDataRecord<UIChatMessage>, string>;
  todoLists!: Table<SessionDataRecord<TodoList>, string>;
  sessionState!: Table<SessionRecord, string>;
  appPins!: Table<AppPinRecord, string>;

  constructor() {
    super('LabChatDB');

    this.version(1).stores({
      chatMessages: 'sessionId',
      todoLists: 'sessionId',
      sessionState: 'id'
    });

    this.version(2).stores({
      chatMessages: 'sessionId',
      todoLists: 'sessionId',
      sessionState: 'id',
      appPins: 'id',
    });
  }
}

export const labDB = new LabDB();