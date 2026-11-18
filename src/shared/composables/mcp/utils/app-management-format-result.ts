import { 
  addTableSchemaFields,
  removeTableSchemaFields,
  addColumnSchemaFields,
  removeColumnSchemaFields,
  selectSchemaFields,
  insertSchemaFields,
  updateSchemaFields,
  deleteSchemaFields,
  executeRawSchemaFields,
  MCPToolCall,
  MCPToolResponse
} from '../../../../shared/types';

export function formatAppManagementToolResult(toolResultContainerClasses: string, toolCall: MCPToolCall, toolResult: MCPToolResponse): string {
  const content = toolResult.content || '{}';

  const toolParams = JSON.parse(toolCall.function.arguments || '{}')
  
  // Show operation type
  const operation = toolCall.function.name.replace('app_management_', '');
  let htmlOutput = `<div class="${toolResultContainerClasses}"><div class="font-bold text-lab-general-text">App Management Result</div><div class="text-lab-general-text">`;

  if (!toolResult.success) {
    htmlOutput += `<div class="text-red-400 mt-2">Error: ${content}</div>`;
    return htmlOutput + '</div></div>';
  }

  htmlOutput += `<div class="text-lab-general-text-muted text-xs">Operation: <code>${operation}</code></div>`;

  switch (toolCall.function.name) {
    case 'app_management_create_app': {
      try {
        const appData = JSON.parse(content);
        htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ App created: ${appData?.name}</div>`;
        htmlOutput += `<div class="text-xs mt-1"><span class="text-lab-general-text-muted">Type:</span> ${appData?.type}</div>`;
        htmlOutput += `<div class="text-xs mt-1"><span class="text-lab-general-text-muted">Order:</span> ${appData?.order}</div>`;
      } catch {
        htmlOutput += `<div class="text-xs mt-1 mt-2">App JSON data returned</div>`;
        htmlOutput += `<pre class="mt-1 text-xs bg-lab-general-bg-muted p-1 rounded max-h-[100px] overflow-auto">${content.substring(0, 500)}</pre>`;
      }
      break;
    }
    case 'app_management_get_app': {
      try {
        const appData = JSON.parse(content);
        htmlOutput += `<div class="text-lab-general-text mt-2">App details retrieved:</div>`;
        htmlOutput += `<div class="text-xs mt-1"><span class="text-lab-general-text-muted">ID:</span> ${appData?.id}</div>`;
        htmlOutput += `<div class="text-xs mt-1"><span class="text-lab-general-text-muted">Name:</span> ${appData?.name}</div>`;
        htmlOutput += `<div class="text-xs mt-1"><span class="text-lab-general-text-muted">Description:</span> ${appData?.description}</div>`;
        htmlOutput += `<div class="text-xs mt-1"><span class="text-lab-general-text-muted">Type:</span> ${appData?.type}</div>`;
      } catch {
        htmlOutput += `<div class="text-xs mt-1 mt-2">App JSON data returned</div>`;
        htmlOutput += `<pre class="mt-1 text-xs bg-lab-general-bg-muted p-1 rounded max-h-[100px] overflow-auto">${content.substring(0, 500)}</pre>`;
      }
      break;
    }
    case 'app_management_get_apps': {
      try {
        const appsData = JSON.parse(content);
        const count = Array.isArray(appsData) ? appsData.length : 0;
        htmlOutput += `<div class="text-lab-general-text mt-2">Found ${count} app${count > 1 ? 's' : ''}:</div>`;
        if (appsData && Array.isArray(appsData) && appsData.length > 0) {
          appsData.forEach((app: Record<string, unknown>, index: number) => {
            htmlOutput += `<div class="border border-lab-general-border rounded p-1 text-xs mt-1">
                                <div class="font-semibold text-lab-general-text">${index + 1}. ${app?.name}</div>
                                <div class="text-xs text-lab-general-text-muted mt-0.5">Type: ${app?.type}</div>
                                <div class="text-xs text-lab-general-text-muted">${app?.description}</div>
                            </div>`;
          });
        }
      } catch {
        htmlOutput += `<div class="text-xs mt-1 mt-2">Apps JSON data returned</div>`;
        htmlOutput += `<pre class="mt-1 text-xs bg-lab-general-bg-muted p-1 rounded max-h-[100px] overflow-auto">${content.substring(0, 500)}</pre>`;
      }
      break;
    }
    case 'app_management_update_app': {
      htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ App updated successfully</div>`;
      if (content !== 'App updated successfully') {
        htmlOutput += `<div class="text-xs mt-1">${content}</div>`;
      }
      break;
    }
    case 'app_management_delete_app': {
      htmlOutput += `<div class="text-red-400 font-semibold mt-2">✗ App deleted successfully</div>`;
      break;
    }
    // DATABASE OPERATIONS
    case 'app_management_add_table': {
      try {
        const paramsResult = addTableSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        const ifNotExists = paramsResult.data?.ifNotExists ?? false;
        const schema = paramsResult.data?.schema || '';
        htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ Table added to ${appId}: ${tableName}${ifNotExists ? ' (if not exists)' : ''}</div>`;
        if (schema && schema.trim()) {
          // Truncate long SQL statements to first 200 chars + ellipsis
          const displaySchema = schema.length > 200 ? schema.substring(0, 200) + '...' : schema;
          htmlOutput += `<div class="text-xs mt-1 font-mono text-lab-general-text-muted bg-lab-general-bg-muted p-1 rounded overflow-x-auto">${displaySchema}</div>`;
        } else {
          htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">SQL schema was not provided in response</div>`;
        }
      } catch {
        htmlOutput += `<pre class="mt-1 text-xs font-mono text-lab-general-text-muted bg-lab-general-bg-muted p-1 rounded overflow-x-auto max-h-[100px]">${content.substring(0, 500)}</pre>`;
      }
      break;
    }
    case 'app_management_remove_table': {
      try {
        const paramsResult = removeTableSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        htmlOutput += `<div class="text-red-400 font-semibold mt-2">✗ Table removed from ${appId}: ${tableName}</div>`;
      } catch {
        htmlOutput += `<div class="text-red-400 text-xs mt-2">Table removal message: ${content}</div>`;
      }
      break;
    }
    case 'app_management_add_column': {
      try {
        const paramsResult = addColumnSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        const columnName = paramsResult.data?.columnName || 'unknown';
        const columnType = paramsResult.data?.columnType || 'text';
        const nullable = paramsResult.data?.nullable ?? false;
        const defaultValue = paramsResult.data?.defaultSchema;

        let columnDef = `${columnName} ${columnType}${nullable ? '' : ' NOT NULL'}`;
        if (defaultValue) {
          columnDef += ` DEFAULT ${defaultValue}`;
        }

        htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ Column ${columnName} added to ${tableName} (App: ${appId})</div>`;
        htmlOutput += `<div class="text-xs mt-1 font-mono text-lab-general-text-muted bg-lab-general-bg-muted p-1 rounded">COLUMN ${columnDef} (nullable: ${nullable})${defaultValue ? ', default: ' + defaultValue : ''}</div>`;
      } catch {
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">Column creation message: ${content}</div>`;
      }
      break;
    }
    case 'app_management_remove_column': {
      try {
        const paramsResult = removeColumnSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        const columnName = paramsResult.data?.columnName || 'unknown';
        const cascade = paramsResult.data?.cascadeForeignKeys ?? false;
        const cascadeNote = cascade ? ', cascade' : '';

        htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ Column ${columnName} removed from ${tableName} (App: ${appId})${cascadeNote}</div>`;
      } catch {
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">Column removal message: ${content}</div>`;
      }
      break;
    }
    case 'app_management_select': {
      try {
        const paramsResult = selectSchemaFields.safeParse(toolParams);
        const sqlRaw = paramsResult.data?.sql || '(no SQL provided)';
        const escapedSql = sqlRaw.replace(/</g, '<');
        const limit = paramsResult.data?.limit;
        const offset = paramsResult.data?.offset;
        const rowCount = content ? JSON.parse(content)?.rows?.length || 0 : 0;
        const responseData = content ? JSON.parse(content) : {};
        const data = responseData?.rows || [];

        htmlOutput += `<div class="text-xs text-lab-general-text font-mono bg-lab-general-bg-muted p-1 rounded mb-1 overflow-x-auto">${escapedSql}</div>`;
        htmlOutput += `<div class="text-xs text-lab-general-text-muted">LIMIT: ${limit || 'N/A'}, OFFSET: ${offset || 'N/A'}</div>`;
        htmlOutput += `<div class="text-lab-general-text font-semibold mt-2">✓ Selected ${rowCount} row${rowCount > 1 ? 's' : ''} from query:</div>`;

        if (Array.isArray(data) && data.length > 0) {
          // Show first row as preview
          const previewRow = data[0];
          htmlOutput += `<div class="text-xs mt-1 bg-lab-general-bg-muted rounded border border-lab-general-border p-1">`;
          Object.entries(previewRow as Record<string, unknown>).forEach(([key, value]) => {
            const valStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 80) + (value ? '...' : '') : String(value);
            htmlOutput += `<div class="truncate">${key}: <span class="text-lab-general-text-muted">${valStr}</span></div>`;
          });
          htmlOutput += `</div>`;

          // Show total count
          htmlOutput += `<div class="text-xs text-lab-general-text-muted mt-1">... and ${data.length - 1} more row${data.length > 2 ? 's' : ''}</div>`;
        } else {
          htmlOutput += `<div class="text-xs text-lab-general-text">No rows returned</div>`;
        }
      } catch {
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">Query result returned:</div>`;
        htmlOutput += `<pre class="mt-1 text-xs bg-lab-general-bg-muted p-1 rounded max-h-[100px] overflow-auto">${content.substring(0, 500)}</pre>`;
      }
      break;
    }
    case 'app_management_insert': {
      try {
        const paramsResult = insertSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        const data = paramsResult.data?.data;
        const recordCount = data ? (Array.isArray(data) ? data.length : 1) : 1;

        htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ Inserted ${recordCount} row${recordCount > 1 ? 's' : ''} into ${tableName} (App: ${appId})</div>`;
        const columns = data && !Array.isArray(data) ? Object.keys(data).slice(0, 5) : ['row'];
        if (Array.isArray(columns)) {
          htmlOutput += `<div class="text-xs mt-1 font-mono text-lab-general-text-muted bg-lab-general-bg-muted p-1 rounded">Columns: ${columns.join(', ')}</div>`;
        }
      } catch {
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">Insert message: ${content}</div>`;
      }
      break;
    }
    case 'app_management_update': {
      try {
        const paramsResult = updateSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        const where = paramsResult.data?.where;

        htmlOutput += `<div class="text-green-400 font-semibold mt-2">✓ Updated ${tableName} (App: ${appId})</div>`;
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">WHERE: ${JSON.stringify(where, null, 2)}</div>`;
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">DATA: ${JSON.stringify(paramsResult.data?.data, null, 2) || '(no data)'}</div>`;
      } catch {
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">Update message: ${content}</div>`;
      }
      break;
    }
    case 'app_management_delete': {
      try {
        const paramsResult = deleteSchemaFields.safeParse(toolParams);
        const appId = paramsResult.data?.id || 'unknown';
        const tableName = paramsResult.data?.tableName || 'unknown';
        const where = paramsResult.data?.where;
        const cascade = paramsResult.data?.cascade ?? false;

        htmlOutput += `<div class="text-red-400 font-semibold mt-2">✗ Deleted from ${tableName} (App: ${appId})${cascade ? ' (cascade)' : ''}</div>`;
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">WHERE: ${JSON.stringify(where, null, 2)} || '(no conditions)'</div>`;
      } catch {
        htmlOutput += `<div class="text-red-400 text-xs mt-2">Delete message: ${content}</div>`;
      }
      break;
    }
    case 'app_management_execute_raw': {
      try {
        const paramsResult = executeRawSchemaFields.safeParse(toolParams);
        const sql = paramsResult.data?.sql || '(no SQL provided)';

        htmlOutput += `<div class="text-lab-general-text font-mono text-xs mt-2 bg-lab-general-bg-muted p-1 rounded overflow-x-auto">${sql.replace(/</g, '<')}</div>`;
        htmlOutput += `<div class="text-xs mt-1 text-lab-general-text">Result:</div>`;
        htmlOutput += `<pre class="mt-1 text-xs bg-lab-general-bg-muted p-1 rounded max-h-[100px] overflow-auto">${content.substring(0, 500)}</pre>`;
      } catch {
        htmlOutput += `<div class="text-red-400 text-xs mt-2">Execution error: ${content}</div>`;
      }
      break;
    }
    default:
      htmlOutput += `<div class="mt-2 text-xs text-lab-general-text-muted">${content.substring(0, 150)}${content.length > 150 ? '...' : ''}</div>`;
  }

  return htmlOutput + '</div></div>';
}
