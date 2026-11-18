import { ref } from 'vue';
import { MCPToolCall, MCPToolData, MCPToolResponse, TodoItem, TodoItemCodeTask, TodoList } from '../../../shared/types';
import { resolveTodoListOperation } from '@/shared/mcp/todo-list-operation';
import {
  createListSchemaFields,
  addTodoItemSchemaFields,
  updateTodoItemSchemaFields,
  markTodoItemCompletedSchemaFields,
  markTodoItemIncompleteSchemaFields,
  completeTodoListSchemaFields,
  getTodoListStateSchemaFields,
  listTodoListsSchemaFields,
  removeTodoListSchemaFields,
  removeTodoItemSchemaFields,
} from '../../../shared/types/schemas/todo-list-schema';

export function useTodoList(
  saveTodoList: (sessionId: string, todolist: TodoList | undefined) => Promise<void>,
  deleteSessionTodoLists: (sessionId: string, todoListId: string) => Promise<void>,
) {
  const expandedTodoLists = ref<Record<string, boolean>>({});
  const expandedTodoItems = ref<Record<string, boolean>>({});
  const expandedTaskSections = ref<Record<string, boolean>>({});
  const expandedTodoListsToggled = ref<boolean>(false);

  const getMatchingTodoList = (sessionId: string, todoListId: string, todolistRef: Map<string, TodoList[]> | undefined): TodoList | undefined => {
    if (!todolistRef) return undefined;
    const sessionTodolists = todolistRef?.get(sessionId);
    if (!sessionTodolists) {
      return undefined;
    }
    const original = sessionTodolists.filter(_ => _.todoListId === todoListId)[0];
    if (!original) return undefined;
    return JSON.parse(JSON.stringify(original));
  };

  const parseToolData = (toolcallData: string) => {
    const toolCallData: MCPToolData = JSON.parse(toolcallData);
    const toolCall: MCPToolCall = toolCallData.toolcall;
    const toolResult: MCPToolResponse = toolCallData.toolresult;
    const operation = resolveTodoListOperation(toolCall, toolResult);
    return {
      toolcall: toolCall,
      toolresult: toolResult,
      operation: operation
    };
  }

  const debouncedTodoListUpdatedHandler = async (toolcallData: string, todolistRef: Map<string, TodoList[]> | undefined) => {
    try {
      const { toolcall, operation } = parseToolData(toolcallData);
      const params = JSON.parse(toolcall.function.arguments || '{}');

      switch (operation) {
        case 'create_list': {
          let matchingTodoList: TodoList | undefined;
          const createResult = createListSchemaFields.safeParse(params);
          if (!createResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid create_list params:', createResult.error);
            break;
          }
          const data = createResult.data;
          if (data.todoListId && data.name) {
            matchingTodoList = data.todoListId ? getMatchingTodoList(data.sessionId, data.todoListId, todolistRef) : undefined;
            if (!matchingTodoList) {
              matchingTodoList = {
                sessionId: data.sessionId,
                parentSessionId: data.parentSessionId,
                todoListId: data.todoListId,
                name: data.name,
                items: [] as TodoItem[],
                completed: false,
              };
            } else {
              matchingTodoList.todoListId = data.todoListId;
              matchingTodoList.name = data.name;
            }
            if (data.sessionId) {
              await saveTodoList(data.sessionId, matchingTodoList);
            }
          }
        }
        break;

        case 'add_todo_item': {
          let matchingTodoList: TodoList | undefined;
          const addResult = addTodoItemSchemaFields.safeParse(params);
          if (!addResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid add_todo_item params:', addResult.error);
            break;
          }
          const data = addResult.data;
          if (data.todoListId && data.item && data.itemId) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              if (matchingTodoList?.todoListId == data.todoListId) {
                matchingTodoList.items.push({
                  itemId: data.itemId,
                  item: data.item,
                  itemData: data.itemData ? data.itemData : '',
                  task: data.task,
                  completed: false
                } as TodoItem);
                if (data.sessionId) {
                  await saveTodoList(data.sessionId, matchingTodoList);
                }
              }
            }
          }
        }
        break;

        case 'update_todo_item': {
          let matchingTodoList: TodoList | undefined;
          const updateResult = updateTodoItemSchemaFields.safeParse(params);
          if (!updateResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid update_todo_item params:', updateResult.error);
            break;
          }
          const data = updateResult.data;
          if (data.todoListId && data.itemId && (data.item || data.itemData)) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              if (matchingTodoList?.todoListId == data.todoListId) {
                const itemIndex = matchingTodoList.items.findIndex((item: TodoItem) => item.itemId === data.itemId);
                if (itemIndex !== -1) {
                  if (data.item !== undefined) {
                    matchingTodoList.items[itemIndex].item = data.item;
                  }
                  if (data.itemData !== undefined) {
                    matchingTodoList.items[itemIndex].itemData = data.itemData;
                  }
                  if (data.task !== undefined) {
                    const task: TodoItemCodeTask = data.task as unknown as TodoItemCodeTask;
                    matchingTodoList.items[itemIndex].task = task;
                  }
                  if (data.sessionId) {
                    await saveTodoList(data.sessionId, matchingTodoList);
                  }
                }
              }
            }
          }
        }
        break;

        case 'mark_todo_item_completed': {
          let matchingTodoList: TodoList | undefined;
          const markCompleteResult = markTodoItemCompletedSchemaFields.safeParse(params);
          if (!markCompleteResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid mark_todo_item_completed params:', markCompleteResult.error);
            break;
          }
          const data = markCompleteResult.data;
          if (data.todoListId && data.itemId) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              if (matchingTodoList?.todoListId == data.todoListId) {
                const itemIndex = matchingTodoList.items.findIndex((item: TodoItem) => item.itemId === data.itemId);
                if (itemIndex !== -1) {
                  matchingTodoList.items[itemIndex].completed = true;
                  if (data.sessionId) {
                    await saveTodoList(data.sessionId, matchingTodoList);
                  }
                }
              }
            }
          }
        }
        break;

        case 'mark_todo_item_incomplete': {
          let matchingTodoList: TodoList | undefined;
          const markIncompleteResult = markTodoItemIncompleteSchemaFields.safeParse(params);
          if (!markIncompleteResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid mark_todo_item_incomplete params:', markIncompleteResult.error);
            break;
          }
          const data = markIncompleteResult.data;
          if (data.todoListId && data.itemId) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              if (matchingTodoList?.todoListId == data.todoListId) {
                const itemIndex = matchingTodoList.items.findIndex((item: TodoItem) => item.itemId === data.itemId);
                if (itemIndex !== -1) {
                  matchingTodoList.items[itemIndex].completed = false;
                  if (data.sessionId) {
                    await saveTodoList(data.sessionId, matchingTodoList);
                  }
                }
              }
            }
          }
        }
        break;

        case 'remove_todo_item': {
          let matchingTodoList: TodoList | undefined;
          const removeItemResult = removeTodoItemSchemaFields.safeParse(params);
          if (!removeItemResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid remove_todo_item params:', removeItemResult.error);
            break;
          }
          const data = removeItemResult.data;
          if (data.todoListId && data.itemId) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              if (matchingTodoList?.todoListId == data.todoListId) {
                const itemIndex = matchingTodoList.items.findIndex((item: TodoItem) => item.itemId === data.itemId);
                if (itemIndex !== -1) {
                  matchingTodoList.items.splice(itemIndex, 1);
                  if (data.sessionId) {
                    await saveTodoList(data.sessionId, matchingTodoList);
                  }
                }
              }
            }
          }
        }
        break;

        case 'remove_todo_list': {
          const removeListResult = removeTodoListSchemaFields.safeParse(params);
          if (!removeListResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid remove_todo_list params:', removeListResult.error);
            break;
          }
          const data = removeListResult.data;
          if (data.todoListId && data.sessionId) {
            await deleteSessionTodoLists(data.sessionId, data.todoListId);
          }
        }
        break;

        case 'complete_todo_list': {
          let matchingTodoList: TodoList | undefined;
          const completeResult = completeTodoListSchemaFields.safeParse(params);
          if (!completeResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid complete_todo_list params:', completeResult.error);
            break;
          }
          const data = completeResult.data;
          if (data.todoListId && data.sessionId) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              matchingTodoList.completed = true;
              await saveTodoList(data.sessionId, matchingTodoList);
            }
          }
        }
        break;

        case 'get_todo_list_state': {
          let matchingTodoList: TodoList | undefined;
          const getStateResult = getTodoListStateSchemaFields.safeParse(params);
          if (!getStateResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid get_todo_list_state params:', getStateResult.error);
            break;
          }
          const data = getStateResult.data;
          if (data.todoListId && data.sessionId) {
            matchingTodoList = getMatchingTodoList(data.sessionId, data.todoListId, todolistRef);
            if (matchingTodoList) {
              await saveTodoList(data.sessionId, matchingTodoList);
            }
          }
        }
        break;

        case 'list_todo_lists': {
          const listResult = listTodoListsSchemaFields.safeParse(params);
          if (!listResult.success) {
            console.error('[debouncedTodoListUpdatedHandler] Invalid list_todo_lists params:', listResult.error);
            break;
          }
          const data = listResult.data;
          if (data.limit) {
            // list_todo_lists is handled by emitting the active list
          }
        }
        break;

        default:
          console.warn('[debouncedTodoListUpdatedHandler] Unknown operation:', operation);
      }
    } catch (error) {
      console.error('[debouncedTodoListUpdatedHandler] Error:', error);
    }
  }

  return {
    expandedTodoLists,
    expandedTodoItems,
    expandedTaskSections,
    expandedTodoListsToggled,
    debouncedTodoListUpdatedHandler
  }
}
