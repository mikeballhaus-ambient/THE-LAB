import { ref } from 'vue';
import { ZodSafeParseResult } from 'zod';
import { createFileSchemaFields, saveDocumentSchemaFields, FileChanges, FileOperations, MCPToolCall, MCPToolData, updateFileSchemaFields, removeFileSchemaFields, UIChatMessage } from '../../../shared/types';

function isMcpToolLogData(data: unknown): data is MCPToolData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    ('toolcall' in record && 'toolresult' in record) ||
    ('toolCall' in record && 'toolResult' in record)
  );
}

function toolCallFromLogData(data: MCPToolData | Record<string, unknown>): MCPToolCall {
  if ('toolcall' in data) {
    return (data as MCPToolData).toolcall;
  }
  return (data as { toolCall: MCPToolCall }).toolCall;
}


export function useFileOverview(handleFileDiffs: (params: ZodSafeParseResult<{
  path: string;
  diffs: {
    start_line: number;
    updated: string;
    original?: string | undefined;
    is_additive?: boolean | undefined;
  }[] | undefined
}>, showPath: boolean, altPath?: string) => FileChanges,
  handleNewFileDiff: (paramsResult: ZodSafeParseResult<{
    path: string;
    content: string;
    overwrite: boolean;
    ensureDir: boolean;
  }>, showPath: boolean, altPath?: string) => FileChanges,
  handleRemoveFile: (params: ZodSafeParseResult<{
    path: string;
    recursive: boolean;
    force: boolean;
  }>, showPath: boolean, altPath?: string) => FileChanges) {

  const fileExpandedStateMap = ref<Map<string, boolean>>(new Map<string, boolean>)
  const fileOpsPanelToggled = ref<boolean>(false);

  const toggleFileExpansion = (file: DistinctFileOperations) => {
    const isOpen = fileExpandedStateMap.value.get(file.path);
    for (const [key] of fileExpandedStateMap.value.entries()) {
      fileExpandedStateMap.value.set(key, false)
    }

    if (!isOpen) fileExpandedStateMap.value.set(file.path, true)
  }

  const getTotalAdditions = (fileOps: DistinctFileOperations[]) => {
    const ops = fileOps
    if (!ops || ops.length === 0) return 0;

    return ops.reduce((sum, item) => {
      const inner = item.operations.reduce((s, op) => s + (op.totalAdditions ?? 0), 0);
      return sum + inner;
    }, 0);
  };

  const getTotalRemovals = (fileOps: DistinctFileOperations[]) => {
    const ops = fileOps
    if (!ops || ops.length === 0) return 0;

    return ops.reduce((sum, item) => {
      const inner = item.operations.reduce((s, op) => s + (op.totalRemovals ?? 0), 0);
      return sum + inner;
    }, 0);
  };

  const getDistinctFileOperations = (activeMessages: UIChatMessage[]) => {
    const fileOps: DistinctFileOperations[] = []
    activeMessages.filter(_ => _.role == 'system').forEach(msg => {
      if (msg.systemLog?.success && isMcpToolLogData(msg.systemLog.data)) {
        const toolCall: MCPToolCall = toolCallFromLogData(msg.systemLog.data as MCPToolData | Record<string, unknown>)
        switch (toolCall.function.name) {
          case 'update_file_update_file':
            {
              if (toolCall.function.arguments) {
                const paramsResult = updateFileSchemaFields.safeParse(JSON.parse(toolCall.function.arguments));

                if (!paramsResult.success) {
                  break;
                }

                // Tool name is already checked in outer switch, execute update logic directly
                const { path } = paramsResult.data;
                const fileChanges = handleFileDiffs(paramsResult, false, 'Updated');
                const html = fileChanges.html || '';
                const totalRemovals = fileChanges.totalRemovals || 0;
                const totalAdditions = fileChanges.totalAdditions || 0;
                const existing = fileOps.filter(_ => _.path == path)[0]
                if (existing) {
                  existing.operations.push({
                    type: 'update',
                    path: path,
                    html: html,
                    totalAdditions: totalAdditions,
                    totalRemovals: totalRemovals
                  } as FileOperations)
                } else {
                  fileOps.push({
                    path: path,
                    operations: [{
                      type: 'update',
                      path: path,
                      html: html,
                      totalAdditions: totalAdditions,
                      totalRemovals: totalRemovals
                    } as FileOperations]
                  } as DistinctFileOperations);
                }
              }
            }
            break;
          case 'create_file':
            {
              if (toolCall.function.arguments) {
                const paramsResult = createFileSchemaFields.safeParse(JSON.parse(toolCall.function.arguments));
                const { path, html, totalRemovals, totalAdditions } = handleNewFileDiff(paramsResult, false, 'Created') as FileChanges;
                const existing = fileOps.filter(_ => _.path == path)[0]
                if (existing) {
                  existing.operations.push({
                    type: 'create',
                    path: path,
                    html: html,
                    totalAdditions: totalAdditions,
                    totalRemovals: totalRemovals
                  } as FileOperations)
                } else {
                  fileOps.push({
                    path: path,
                    operations: [{
                      type: 'create',
                      path: path,
                      html: html,
                      totalAdditions: totalAdditions,
                      totalRemovals: totalRemovals
                    } as FileOperations]
                  } as DistinctFileOperations);
                }
              }
            }
            break;
          case 'remove_file':
            {
              if (toolCall.function.arguments) {
                const paramsResult = removeFileSchemaFields.safeParse(JSON.parse(toolCall.function.arguments));
                const { path, html, totalRemovals, totalAdditions } = handleRemoveFile(paramsResult, false, 'Removed') as FileChanges;
                const existing = fileOps.filter(_ => _.path == path)[0]
                if (existing) {
                  existing.operations.push({
                    type: 'remove',
                    path: path,
                    html: html,
                    totalAdditions: totalAdditions,
                    totalRemovals: totalRemovals
                  } as FileOperations)
                } else {
                  fileOps.push({
                    path: path,
                    operations: [{
                      type: 'remove',
                      path: path,
                      html: html,
                      totalAdditions: totalAdditions,
                      totalRemovals: totalRemovals
                    } as FileOperations]
                  } as DistinctFileOperations);
                }
              }
            }
            break;
          case 'documentor_save_document':
            {
              if (toolCall.function.arguments) {
                const paramsResult = saveDocumentSchemaFields.safeParse(JSON.parse(toolCall.function.arguments));
                if (!paramsResult.success) {
                  break;
                }
                const { path: docPath } = paramsResult.data;

                // Call handleNewFileDiff helper for saving new documents
                const fileChanges = handleNewFileDiff(
                  paramsResult as ZodSafeParseResult<{
                    path: string;
                    content: string;
                    overwrite: boolean;
                    ensureDir: boolean;
                  }>,
                  false,
                  'Saved',
                );
                const html = fileChanges.html || '';
                const totalRemovals = 0;
                const totalAdditions = fileChanges.totalAdditions || 0;

                const existing = fileOps.filter(_ => _.path == docPath)[0];
                if (existing) {
                  existing.operations.push({
                    type: 'create',
                    path: docPath,
                    html: html,
                    totalAdditions: totalAdditions,
                    totalRemovals: totalRemovals
                  } as FileOperations)
                } else {
                  fileOps.push({
                    path: docPath,
                    operations: [{
                      type: 'create',
                      path: docPath,
                      html: html,
                      totalAdditions: totalAdditions,
                      totalRemovals: totalRemovals
                    } as FileOperations]
                  } as DistinctFileOperations);
                }
              }
            }
            break;
          case 'documentor_update_document':
            {
              if (toolCall.function.arguments) {
                const paramsResult = updateFileSchemaFields.safeParse(JSON.parse(toolCall.function.arguments));
                if (!paramsResult.success) {
                  break;
                }
                const { path: docPath } = paramsResult.data;

                // Call handleFileDiffs helper - it will process all diffs and return FileChanges
                const fileOpsResult = handleFileDiffs(paramsResult, false, 'Documentor');

                const html = fileOpsResult.html;
                const totalRemovals = fileOpsResult.totalRemovals || 0;
                const totalAdditions = fileOpsResult.totalAdditions || 0;

                const existing = fileOps.filter(_ => _.path == docPath)[0];
                if (existing) {
                  existing.operations.push({
                    type: 'update',
                    path: docPath,
                    html: html,
                    totalAdditions: totalAdditions,
                    totalRemovals: totalRemovals
                  } as FileOperations)
                } else {
                  fileOps.push({
                    path: docPath,
                    operations: [{
                      type: 'update',
                      path: docPath,
                      html: html,
                      totalAdditions: totalAdditions,
                      totalRemovals: totalRemovals
                    } as FileOperations]
                  } as DistinctFileOperations);
                }
              }
            }
            break;
        }
      }
    });

    return fileOps;
  }

  return {
    fileExpandedStateMap,
    fileOpsPanelToggled,
    toggleFileExpansion,
    getDistinctFileOperations,
    getTotalAdditions,
    getTotalRemovals
  }
}

export interface DistinctFileOperations {
  path: string,
  operations: FileOperations[]
}
