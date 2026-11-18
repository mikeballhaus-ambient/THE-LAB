import { ref } from 'vue';
import { ChatSessionRecord, TodoList, UIChatMessage } from '../../../shared/types';

export const useSessionManagement = (
  sessions: () => ChatSessionRecord[],
  selectedSessionsVal: () => string[],
  todolistRef: () => Map<string, TodoList[]> | undefined,
  messagesRef: () => Map<string, UIChatMessage[]> | undefined
) => {

  const includeMessages = ref<boolean>(true)
  const includeTodoLists = ref<boolean>(true)

  const exportSessionData = () => {
    const _selectedSessionData = sessions().filter(_ => selectedSessionsVal().includes(_.sessionId))
    const _currentMessages = messagesRef()
    const _currentTodoLists = todolistRef()
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessions: _selectedSessionData.map(_ => {
        const curMessages = _currentMessages?.get(_.sessionId)
        const curTodoLists = _currentTodoLists?.get(_.sessionId)
        return {
          ..._,
          messages: curMessages ? curMessages : [],
          todoLists: curTodoLists ? curTodoLists : [],
        }
      })
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab-sessions-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    exportSessionData,
    includeMessages,
    includeTodoLists
  };
};
