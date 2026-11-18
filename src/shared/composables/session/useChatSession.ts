import { ref, onUnmounted } from 'vue';
import { ChatPersona, ChatSessionRecord, TodoList, UIChatMessage } from '../../../shared/types';
import { SessionManager } from './session-manager';
import { Store } from '../store';
import { mergePersistedToolResultMessages } from '@/shared/utils/merge-persisted-tool-result-messages';
import { personaUtils } from '@/shared/utils/persona-utils';

export async function useChatSession(sessionManager: SessionManager) {

  const sessionsRef = ref<ChatSessionRecord[]>([]);
  const activeSessionRef = ref<ChatSessionRecord | null>(null);
  const messagesRef = ref<Map<string, UIChatMessage[]>>();
  const todolistRef = ref<Map<string, TodoList[]>>();

  // Cleanup on unmount
  onUnmounted(() => {
    if (storageHandler) {
      window.removeEventListener('storage', storageHandler as EventListener);
      storageHandler = null;
    }
  });

  const manager = sessionManager;
  await manager.init();

  const messageStore = new Store<UIChatMessage>('lab_chat_messages', manager);
  const todolistStore = new Store<TodoList>('lab_chat_todolists', manager);

  sessionsRef.value = await manager.getActiveSessions();
  activeSessionRef.value = await getActiveSession();
  messagesRef.value = new Map(messageStore.itemsMap.value)
  todolistRef.value = new Map(todolistStore.itemsMap.value)

  await Promise.all([
    messageStore.init(),
    todolistStore.init()
  ]);

  let storageHandler: ((e: StorageEvent) => void) | null = null;
  setupStorageListener();

  async function updateRefsFromStorage(): Promise<void> {
    const sessions = await manager.getActiveSessions();
    const messageMap = new Map<string, UIChatMessage[]>();
    const todoMap = new Map<string, TodoList[]>();

    sessions.forEach(s => {
      messageMap.set(s.sessionId, [...messageStore.getItems(s.sessionId)]);
      todoMap.set(s.sessionId, [...todolistStore.getItems(s.sessionId)]);
    });

    sessionsRef.value = sessions;
    messagesRef.value = messageMap;
    todolistRef.value = todoMap;
    activeSessionRef.value = await getActiveSession();
  }

  async function getActiveSession(): Promise<ChatSessionRecord | null> {
    const activeSessionId = await manager.getActiveSessionId()
    if (!activeSessionId) return null
    const session = sessionsRef.value.filter(_ => _.sessionId == activeSessionId)[0]
    return session || null
  }

  function setupStorageListener(): void {
    storageHandler = async (e: StorageEvent) => {
      if (e.key === 'lab_chat_sessions') {
        await updateRefsFromStorage();
      } else if (e.key === 'lab_chat_messages') {
        messagesRef.value = new Map(
          [...messageStore.itemsMap.value].map(([sessionId, msgs]) => [
            sessionId,
            [...msgs] // clone array
          ])
        )
      } else if (e.key === 'lab_chat_todolists') {
        todolistRef.value = new Map(
          [...todolistStore.itemsMap.value].map(([sessionId, todos]) => [
            sessionId,
            [...todos]
          ])
        )
      }
    };

    window.addEventListener('storage', storageHandler as EventListener);
  }

  async function switchToSession(sessionId: string): Promise<void> {
    await manager.setActiveSession(sessionId);
    //activeSessionRef.value = await getActiveSession() ?? null;
    await updateRefsFromStorage();
  }

  async function createNewSession(persona?: ChatPersona, sessionId?: string): Promise<string | null> {
    const newSession = sessionId ?
      await manager.createNewSession(sessionId, '', persona) :
      await manager.createSession('', persona);
    await switchToSession(newSession.sessionId);
    return newSession.sessionId;
  }

  async function deleteCurrentSession(sessionId?: string): Promise<boolean> {
    const allSessions = await manager.getActiveSessions();

    if (allSessions.length <= 1) {
      return false;
    }

    if (sessionId) {
      const deletedId = await manager.deleteSession(sessionId);

      if (deletedId) {
        messageStore.deleteItems(sessionId);
        todolistStore.deleteItems(sessionId)

        const remainingSessions = await manager.getActiveSessions();

        if (remainingSessions.length === 0) {
          createNewSession();
        } else {
          await manager.setActiveSession(remainingSessions[0].sessionId)
        }

        await updateRefsFromStorage();
      }
    }
    return !!sessionId;
  }

  async function cleanupAndSetActive(): Promise<void> {
    manager.cleanupStaleSessions();

    const restoredSessionId = await manager.restoreActiveSession();
    switchToSession(restoredSessionId!);
  }

  async function updateSession(sessionId: string, updates: Partial<ChatSessionRecord>): Promise<void> {
    await manager.updateSession(sessionId, updates);
    await updateRefsFromStorage();
  }

  async function deleteSession(sessionId: string): Promise<boolean> {
    const deletedSession = await manager.deleteSession(sessionId);
    await updateRefsFromStorage();
    return deletedSession
  }

  async function getActiveSessions(): Promise<ChatSessionRecord[]> {
    return await manager.getActiveSessions();
  }

  async function setLabView(isLabAssistantView: boolean): Promise<void> {
    await manager.setLabView(isLabAssistantView);
  }

  async function isLabAssistantView(): Promise<boolean> {
    return await manager.isLabAssistantView();
  }

  async function setLabAssistantPreview(isLabAssistantPreview: boolean): Promise<void> {
    await manager.setLabAssistantPreview(isLabAssistantPreview);
  }

  async function isLabAssistantPreview(): Promise<boolean> {
    return await manager.isLabAssistantPreview();
  }

  async function setStreamingEnabled(streamingEnabled: boolean): Promise<void> {
    await manager.setStreamingEnabled(streamingEnabled);
  }

  async function getStreamingEnabled(): Promise<boolean> {
    return await manager.getStreamingEnabled();
  }

    async function setDeveloperMode(isDeveloperMode: boolean): Promise<void> {
    await manager.setDeveloperMode(isDeveloperMode);
  }

  async function getDeveloperMode(): Promise<boolean> {
    return await manager.getDeveloperMode();
  }

  async function setShowServerApps(showServerApps: boolean): Promise<void> {
    await manager.setShowServerApps(showServerApps);
  }

  async function getShowServerApps(): Promise<boolean> {
    return await manager.getShowServerApps();
  }

  async function setShowDependencyApps(showDependencyApps: boolean): Promise<void> {
    await manager.setShowDependencyApps(showDependencyApps);
  }

  async function getShowDependencyApps(): Promise<boolean> {
    return await manager.getShowDependencyApps();
  }

  async function saveTodoList(sessionId: string, todolist: TodoList | undefined): Promise<void> {
    if (todolist) {

      const sessionData = todolistRef.value?.get(sessionId)
      const existingTodoLists = sessionData ? [...sessionData] : []

      const existingTodoListIndex = existingTodoLists.findIndex((item: TodoList) => item.todoListId === todolist.todoListId)

      if (existingTodoListIndex === -1) {
        // New todo list - CREATE path
        await todolistStore.saveItem(sessionId, todolist)
      } else {
        // Existing todo list - UPDATE path
        const updatedTodoLists = [...existingTodoLists];
        updatedTodoLists[existingTodoListIndex] = todolist;
        await todolistStore.updateItems(sessionId, updatedTodoLists)
      }

      todolistRef.value = new Map(
        [...todolistStore.itemsMap.value].map(([id, todos]) => [
          id,
          [...todos]
        ])
      );
    }
  }

  async function deleteSessionTodoLists(sessionId: string, todoListId: string): Promise<void> {
    const sessionData = todolistRef.value?.get(sessionId)
    const existingTodoLists = sessionData ? [...sessionData] : []

    const updatedTodoLists = existingTodoLists.filter(_ => _.todoListId !== todoListId)

    await todolistStore.updateItems(sessionId, updatedTodoLists)

    todolistRef.value = new Map(
      [...todolistStore.itemsMap.value].map(([id, todos]) => [
        id,
        [...todos]
      ])
    );
  }

  async function saveMessage(sessionId: string, message: UIChatMessage | null): Promise<void> {
    if (message) {
      await messageStore.saveItem(sessionId, message);
      const updatedMessages = [...messageStore.itemsMap.value].map(([id, msgs]) => [
        id,
        JSON.parse(JSON.stringify(msgs))
      ] as [string, UIChatMessage[]]);
      messagesRef.value = new Map(updatedMessages);
    }
  }

  function bumpMessagesRef(sessionId: string): void {
    const messages = messagesRef.value?.get(sessionId) || [];
    const newMap = new Map(messagesRef.value);
    newMap.set(sessionId, [...messages]);
    messagesRef.value = newMap;
  }

  async function updateMessages(sessionId: string): Promise<void> {
    const persisted = messageStore.getItems(sessionId);
    const memory = messagesRef.value?.get(sessionId) || [];
    const messages = mergePersistedToolResultMessages(persisted, memory);
    await messageStore.updateItems(sessionId, messages);
    const newMap = new Map(messagesRef.value);
    newMap.set(sessionId, messages);
    messagesRef.value = newMap;
  }

  async function waitForPendingMessageInserts(sessionId: string): Promise<void> {
    await (insertBeforePlaceholderChains.get(sessionId) ?? Promise.resolve());
  }

  async function deleteSessionMessages(sessionId: string): Promise<void> {
    await messageStore.deleteItems(sessionId);
  }

  async function setContextUsed(sessionId: string, percentage: number): Promise<void> {
    await manager.updateSession(sessionId, {
      contextUsed: Math.max(0, Math.min(100, percentage)),
      lastActivity: Date.now()
    });
    await updateRefsFromStorage();
  }

  function getPersonaBadgeColor(personaName?: string): string {
    return personaUtils.getPersonaBadgeClass(personaName);
  }

  function getPersonaBadgeIcon(personaName?: string): string {
    return personaUtils.getPersonaBadgeIcon(personaName);
  }

  /** Serialize tool-log inserts so TOOL_CALL_BEFORE always lands before matching AFTER in the transcript. */
  const insertBeforePlaceholderChains = new Map<string, Promise<void>>();

  async function insertBeforePlaceholder(chatId: string, sessionId: string | undefined, newMessage: UIChatMessage): Promise<void> {
    if (!sessionId) return;

    const run = async (): Promise<void> => {
      const messages = messagesRef.value?.get(sessionId);
      if (!messages) {
        await saveMessage(sessionId, newMessage);
        return;
      }

      const index = messages.findIndex((msg: UIChatMessage) => (msg as UIChatMessage).chatId == chatId);
      if (index === -1) {
        await saveMessage(sessionId, newMessage);
        return;
      }

      const newMessages = mergePersistedToolResultMessages(messageStore.getItems(sessionId), [
        ...messages.slice(0, index),
        newMessage,
        ...messages.slice(index),
      ]);

      await messageStore.updateItems(sessionId, newMessages);

      const newMap = new Map(messagesRef.value);
      newMap.set(sessionId, newMessages);
      messagesRef.value = newMap;
    };

    const prev = insertBeforePlaceholderChains.get(sessionId) ?? Promise.resolve();
    const next = prev.then(run, run);
    insertBeforePlaceholderChains.set(sessionId, next.catch(() => undefined));
    await next;
  }

  return {
    sessionsRef,
    activeSessionRef,
    messagesRef,
    todolistRef,
    createNewSession,
    deleteCurrentSession,
    cleanupAndSetActive,
    updateSession,
    deleteSession,
    getActiveSessions,
    saveTodoList,
    deleteSessionTodoLists,
    saveMessage,
    updateMessages,
    bumpMessagesRef,
    deleteSessionMessages,
    setContextUsed,
    switchToSession,
    getPersonaBadgeColor,
    getPersonaBadgeIcon,
    insertBeforePlaceholder,
    waitForPendingMessageInserts,
    setLabView,
    isLabAssistantView,
    setStreamingEnabled,
    getStreamingEnabled,
    setLabAssistantPreview,
    isLabAssistantPreview,
    setDeveloperMode,
    getDeveloperMode,
    setShowServerApps,
    getShowServerApps,
    setShowDependencyApps,
    getShowDependencyApps,
  };
}
