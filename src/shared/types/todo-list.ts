import type { ChatPersona } from './index';

export enum CodeTaskType {
  CREATE_FILE = 'create_file',
  CREATE_DIRECTORY = 'create_directory',
  EDIT_FILE = 'edit_file',
  REPLACE_CONTENT = 'replace_content',
  INSERT_AT_LINE = 'insert_at_line',
  DELETE_FILE = 'delete_file',
  DELETE_DIRECTORY = 'delete_directory',
  READ_FILE = 'read_file',
  SEARCH_FILE = 'search_file',
  VALIDATE_CODE = 'validate_code',
  LINT_CODE = 'lint_code',
  REFACTOR_CODE = 'refactor_code',
  EXTRACT_METHOD = 'extract_method',
  RENAME_SYMBOL = 'rename_symbol',
  MOVE_FILE = 'move_file',
  DEBUG_ISSUE = 'debug_issue',
  FIX_BUG = 'fix_bug',
  ANALYZE_ERROR = 'analyze_error',
  ANALYZE_CODE = 'analyze_code',
  OPTIMIZE_PERFORMANCE = 'optimize_performance',
  SECURE_CODE = 'secure_code',
  DOCUMENT_CODE = 'document_code',
  GENERATE_DOCS = 'generate_docs',
  WRITE_TEST = 'write_test',
  RUN_TESTS = 'run_tests',
  RUN_SINGLE_TEST = 'run_single_test',
  DEBUG_TESTS = 'debug_tests',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum CodeOperationAction {
  CREATE = 'create',
  REPLACE = 'replace',
  INSERT = 'insert',
  DELETE = 'delete',
}

/**
 * CodeOperationRange: Line range for replace/edit operations.
 * Line numbers are 1-indexed and inclusive.
 */
export interface CodeOperationRange {
  startLine: number;  // Minimum: 1
  endLine: number;    // Must be >= startLine
}

/**
 * TodoItemCodeTask: Structured code operation assignment.
 * Contains all metadata needed for a code agent to execute a specific
 * programming task with full context about what, where, and how.
 */
export interface TodoItemCodeTask {
  taskId: string;                                  // Unique UUID for this code task
  description: string;                             // Human-readable task description
  type?: CodeTaskType;                             // Enum: Type of code operation (optional)
  filePath?: string;                               // Relative path in workspace (optional)
  codeContent?: string;                            // Full code to create/replace (optional)
  // FLATTENED OPERATION RANGE (replacing nested object):
  operationRangeStartLine?: number;                // Line range for edits (optional, 1-indexed)
  operationRangeEndLine?: number;                  // Line range for edits (optional, 1-indexed)
  operationAction?: CodeOperationAction;           // Action type (optional)
  priority?: TaskPriority;                         // Execution priority (optional)
  dependencies?: string[];                         // Other TodoItem IDs with completion dependencies
  persona?: ChatPersona;                           // Target persona for code execution (optional)
  createdAt?: number;                              // Timestamp of task creation (optional)
  updatedAt?: number;                              // Timestamp of last modification (optional)
}

export interface TodoItem {
  itemId: string;                  // Unique identifier for the todo item
  item: string;                    // Short human-readable task title
  itemData: string;                // Detailed description with optional newline formatting
  completed: boolean;              // Completion status flag
  task?: TodoItemCodeTask;         // Single code task for code agents
}

export interface TodoList {
  todoListId: string;
  sessionId: string;
  parentSessionId?: string;
  name: string;
  description?: string;
  items: TodoItem[];
  completed: boolean;
}