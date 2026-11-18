import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  TODO_LIST_ADD_TODO_ITEM_DESC,
  TODO_LIST_COMPLETE_TODO_LIST_DESC,
  TODO_LIST_CREATE_LIST_DESC,
  TODO_LIST_GET_TODO_LIST_STATE_DESC,
  TODO_LIST_LIST_TODO_LISTS_DESC,
  TODO_LIST_MARK_TODO_ITEM_COMPLETED_DESC,
  TODO_LIST_MARK_TODO_ITEM_INCOMPLETE_DESC,
  TODO_LIST_REMOVE_TODO_ITEM_DESC,
  TODO_LIST_REMOVE_TODO_LIST_DESC,
  TODO_LIST_UPDATE_TODO_ITEM_DESC,
} from '@/shared/constants/lab-session-todo-tools';
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
  TodoList,
  TodoItemCodeTaskSchema,
} from '@/shared/types';

// 1. Initialize the Todo List MCP Server
export const todoListMcpServer = new McpServer({
  name: 'system-todo-list-server',
  version: '1.0.0',
});

// In-memory storage for todo lists (simulating database)
const todoListsStore: Record<string, TodoList> = {};

export const syncTodoLists = (sessionId: string, todoLists: TodoList[]): void => {
  // Clear existing todo lists for this session and replace with the new ones from frontend
  for (const key in todoListsStore) {
    if (todoListsStore[key].sessionId === sessionId) {
      delete todoListsStore[key];
    }
  }

  for (const todoList of todoLists) {
    todoListsStore[todoList.todoListId] = {
      todoListId: todoList.todoListId,
      sessionId: todoList.sessionId,
      parentSessionId: todoList.parentSessionId,
      name: todoList.name,
      description: todoList.description,
      items: [...todoList.items], // Deep copy the items array
      completed: todoList.completed
    } as TodoList;
  }
}

// ==========================================
// TOOL 1: Create List
// ==========================================

todoListMcpServer.registerTool(
  'todo_list_create_list',
  {
    description: TODO_LIST_CREATE_LIST_DESC,
    inputSchema: createListSchemaFields,
  },
  async ({ sessionId, name, todoListId }) => {
    if (todoListsStore[todoListId]) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' already exists.` }],
        isError: true,
      };
    }

    const newList = {
      todoListId,
      sessionId,
      name,
      items: [],
      completed: false,
    };

    todoListsStore[todoListId] = newList;
    return {
      content: [{ type: 'text', text: JSON.stringify(newList) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 2: Add Todo Item
// ==========================================

todoListMcpServer.registerTool(
  'todo_list_add_todo_item',
  {
    description: TODO_LIST_ADD_TODO_ITEM_DESC,
    inputSchema: addTodoItemSchemaFields,
  },
  async ({ sessionId, todoListId, itemId, item, itemData, ...taskParams }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    const newTodoItem = {
      itemId,
      item,
      itemData,
      completed: false,
    };

    // Add optional flattened task if provided
    if (taskParams.task) {
      const taskObj = taskParams.task;
      Object.assign(newTodoItem, { task: taskObj });
    }

    todoList.items.push(newTodoItem);
    return {
      content: [{ type: 'text', text: JSON.stringify(newTodoItem) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 3: Update Todo Item
// ==========================================

todoListMcpServer.registerTool(
  'todo_list_update_todo_item',
  {
    description: TODO_LIST_UPDATE_TODO_ITEM_DESC,
    inputSchema: updateTodoItemSchemaFields,
  },
  async ({ sessionId, todoListId, itemId, item, itemData, ...taskParams }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    const itemIndex = todoList.items.findIndex((itemItem: { itemId: string }) => itemItem.itemId === itemId);
    if (itemIndex === -1) {
      return {
        content: [{ type: 'text', text: `Todo item with id '${itemId}' not found in todo list '${todoListId}'.` }],
        isError: true,
      };
    }

    todoList.items[itemIndex].item = item;
    if (itemData) todoList.items[itemIndex].itemData = itemData;

    // Update optional flattened task if provided
    if (taskParams.task) {
      todoList.items[itemIndex].task = TodoItemCodeTaskSchema.parse(taskParams.task)
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(todoList.items[itemIndex]) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 4: Mark Todo Item Completed
// ==========================================

todoListMcpServer.registerTool(
  'todo_list_mark_todo_item_completed',
  {
    description: TODO_LIST_MARK_TODO_ITEM_COMPLETED_DESC,
    inputSchema: markTodoItemCompletedSchemaFields,
  },
  async ({ sessionId, todoListId, itemId }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    const itemIndex = todoList.items.findIndex(item => item.itemId === itemId);
    if (itemIndex === -1) {
      return {
        content: [{ type: 'text', text: `Todo item with id '${itemId}' not found in todo list '${todoListId}'.` }],
        isError: true,
      };
    }

    todoList.items[itemIndex].completed = true;
    const allCompleted = todoList.items.every(item => item.completed);
    todoList.completed = allCompleted;

    return {
      content: [{ type: 'text', text: JSON.stringify(todoList.items[itemIndex]) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 5: Mark Todo Item Incomplete
// ==========================================


todoListMcpServer.registerTool(
  'todo_list_mark_todo_item_incomplete',
  {
    description: TODO_LIST_MARK_TODO_ITEM_INCOMPLETE_DESC,
    inputSchema: markTodoItemIncompleteSchemaFields,
  },
  async ({ sessionId, todoListId, itemId }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    const itemIndex = todoList.items.findIndex((itemItem: { itemId: string }) => itemItem.itemId === itemId);
    if (itemIndex === -1) {
      return {
        content: [{ type: 'text', text: `Todo item with id '${itemId}' not found in todo list '${todoListId}'.` }],
        isError: true,
      };
    }

    todoList.items[itemIndex].completed = false;
    return {
      content: [{ type: 'text', text: JSON.stringify(todoList.items[itemIndex]) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 6: Complete Todo List
// ==========================================


todoListMcpServer.registerTool(
  'todo_list_complete_todo_list',
  {
    description: TODO_LIST_COMPLETE_TODO_LIST_DESC,
    inputSchema: completeTodoListSchemaFields,
  },
  async ({ sessionId, todoListId }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    todoList.completed = true;
    return {
      content: [{ type: 'text', text: JSON.stringify(todoList) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 7: Get Todo List State
// ==========================================


todoListMcpServer.registerTool(
  'todo_list_get_todo_list_state',
  {
    description: TODO_LIST_GET_TODO_LIST_STATE_DESC,
    inputSchema: getTodoListStateSchemaFields,
  },
  async ({ sessionId, todoListId }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(todoList) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 8: List Todo Lists
// ==========================================


todoListMcpServer.registerTool(
  'todo_list_list_todo_lists',
  {
    description: TODO_LIST_LIST_TODO_LISTS_DESC,
    inputSchema: listTodoListsSchemaFields,
  },
  async ({ sessionId, limit }) => {
    void sessionId;
    const todoListsArray = Object.values(todoListsStore);
    const limitedTodoLists = limit ? todoListsArray.slice(0, limit) : todoListsArray;

    return {
      content: [{ type: 'text', text: JSON.stringify(limitedTodoLists) }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 9: Remove Todo List
// ==========================================


todoListMcpServer.registerTool(
  'todo_list_remove_todo_list',
  {
    description: TODO_LIST_REMOVE_TODO_LIST_DESC,
    inputSchema: removeTodoListSchemaFields,
  },
  async ({ sessionId, todoListId }) => {
    void sessionId;
    if (!todoListsStore[todoListId]) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    delete todoListsStore[todoListId];
    return {
      content: [{ type: 'text', text: `Todo list '${todoListId}' has been removed.` }],
      isError: false,
    };
  }
);

// ==========================================
// TOOL 10: Remove Todo Item
// ==========================================


todoListMcpServer.registerTool(
  'todo_list_remove_todo_item',
  {
    description: TODO_LIST_REMOVE_TODO_ITEM_DESC,
    inputSchema: removeTodoItemSchemaFields,
  },
  async ({ sessionId, todoListId, itemId }) => {
    void sessionId;
    const todoList = todoListsStore[todoListId];
    if (!todoList) {
      return {
        content: [{ type: 'text', text: `Todo list with id '${todoListId}' does not exist.` }],
        isError: true,
      };
    }

    const itemIndex = todoList.items.findIndex(item => item.itemId === itemId);
    if (itemIndex === -1) {
      return {
        content: [{ type: 'text', text: `Todo item with id '${itemId}' not found in todo list '${todoListId}'.` }],
        isError: true,
      };
    }

    todoList.items.splice(itemIndex, 1);
    return {
      content: [{ type: 'text', text: `Todo item '${itemId}' has been removed from list '${todoListId}'.` }],
      isError: false,
    };
  }
);

// ==========================================
// Export Manifest Definitions For Registry Mapping
// ==========================================
export const todoListToolsManifest = [
  {
    id: 'todo_list_create_list',
    name: 'Todo List - Create List',
    description: TODO_LIST_CREATE_LIST_DESC,
    params: createListSchemaFields,
  },
  {
    id: 'todo_list_add_todo_item',
    name: 'Todo List - Add Todo Item',
    description: TODO_LIST_ADD_TODO_ITEM_DESC,
    params: addTodoItemSchemaFields,
  },
  {
    id: 'todo_list_update_todo_item',
    name: 'Todo List - Update Todo Item',
    description: TODO_LIST_UPDATE_TODO_ITEM_DESC,
    params: updateTodoItemSchemaFields,
  },
  {
    id: 'todo_list_mark_todo_item_completed',
    name: 'Todo List - Mark Todo Item Completed',
    description: TODO_LIST_MARK_TODO_ITEM_COMPLETED_DESC,
    params: markTodoItemCompletedSchemaFields,
  },
  {
    id: 'todo_list_mark_todo_item_incomplete',
    name: 'Todo List - Mark Todo Item Incomplete',
    description: TODO_LIST_MARK_TODO_ITEM_INCOMPLETE_DESC,
    params: markTodoItemIncompleteSchemaFields,
  },
  {
    id: 'todo_list_complete_todo_list',
    name: 'Todo List - Complete Todo List',
    description: TODO_LIST_COMPLETE_TODO_LIST_DESC,
    params: completeTodoListSchemaFields,
  },
  {
    id: 'todo_list_get_todo_list_state',
    name: 'Todo List - Get Todo List State',
    description: TODO_LIST_GET_TODO_LIST_STATE_DESC,
    params: getTodoListStateSchemaFields,
  },
  {
    id: 'todo_list_list_todo_lists',
    name: 'Todo List - List Todo Lists',
    description: TODO_LIST_LIST_TODO_LISTS_DESC,
    params: listTodoListsSchemaFields,
  },
  {
    id: 'todo_list_remove_todo_list',
    name: 'Todo List - Remove Todo List',
    description: TODO_LIST_REMOVE_TODO_LIST_DESC,
    params: removeTodoListSchemaFields,
  },
  {
    id: 'todo_list_remove_todo_item',
    name: 'Todo List - Remove Todo Item',
    description: TODO_LIST_REMOVE_TODO_ITEM_DESC,
    params: removeTodoItemSchemaFields,
  },
];
