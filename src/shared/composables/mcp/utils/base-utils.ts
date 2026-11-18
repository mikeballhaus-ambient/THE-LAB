import { ZodSafeParseResult } from 'zod';
import { ToolsList, diffSchemaFields, DiffItem, FileChanges, diffColors, FileOperations } from '../../../../shared/types';
export function matchTool(toolsData: ToolsList[], toolId: string): ToolsList | undefined {

  const toolData = toolsData.filter(_ => _.id == toolId)[0]

  if (toolData) {
    return toolData;
  }

  return undefined
}

/** Display label when tools manifest is not loaded or tool id is unknown. */
export function fallbackToolDisplayName(toolId: string): string {
  const trimmed = toolId.trim();
  if (!trimmed) {
    return 'Tool';
  }
  return trimmed
    .replace(/^app_management_/, '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function handleNewFileDiff(paramsResult: ZodSafeParseResult<{
  path: string;
  content: string;
  overwrite: boolean;
  ensureDir: boolean;
}>, showPath: boolean, altPath?: string): FileChanges {

  const path = paramsResult.data?.path;
  const contentParam = paramsResult.data?.content;
  const lightBg = diffColors.additive.light;
  const darkBg = diffColors.additive.dark;

  const lines = (contentParam || '').split('\n')

  let htmlOutput = `<div class="flex justify-between text-xs font-mono px-2 py-1">`;
  if (showPath) htmlOutput += ` <div class="text-lab-general-text-muted mb-1">${path || 'N/A'}</div>`;
  if (!showPath && altPath) htmlOutput += ` <div class="text-lab-general-text-muted"><i class="fa fa-solid fa-file-pen mr-2"></i>${altPath || 'N/A'}</div>`;
  htmlOutput += ` <div class="flex gap-1">`;
  htmlOutput += `     <div class="${diffColors.additive.text}">+${lines.length}</div>`;
  htmlOutput += `     <div class="${diffColors.subtractive.text}">-0</div>`;
  htmlOutput += ` </div>`;
  htmlOutput += `</div>`;



  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const code = escapeHtml(lines[i])

    htmlOutput += `<div class="flex text-xs font-mono">`
    htmlOutput += `   <div class="w-[20px]! min-w-[20px]! max-w-[20px]! ${lightBg} pl-1 pr-1">${lineNumber}</div>`
    htmlOutput += `   <div class="w-[20px]! min-w-[20px]! max-w-[20px]! text-right ${lightBg} pl-1 pr-1">+</div>`
    htmlOutput += `   <div class="w-full h-full ${darkBg} pl-1 pr-1">${code.length > 0 ? code.replace(/\s/g, '&nbsp;') : '&nbsp;'}</div>`
    htmlOutput += `</div>`
  }

  return {
    path: path,
    html: htmlOutput,
    totalRemovals: 0,
    totalAdditions: lines.length
  } as FileChanges
}

export function handleFileDiffs(params: ZodSafeParseResult<{
  path: string;
  diffs: {
    start_line: number;
    updated: string;
    original?: string | undefined;
    is_additive?: boolean | undefined;
  }[] | undefined;
}>, showPath: boolean, altPath?: string): FileChanges {

  const path = params.data?.path;
  const diffPatches = params.data?.diffs;

  const patches = diffPatches || [];

  let htmlOutput = `<div class="space-y-1 text-sm">`;

  let patchDiffsHtml = '';
  let totalAdditions = 0;
  let totalRemovals = 0;

  patches.forEach((patch) => {
    const curDiff = diffSchemaFields.safeParse(patch);
    const { html, patchRemovals, patchAdditions } = handleDiff(curDiff, showPath, altPath) as DiffItem;

    patchDiffsHtml += html;
    totalRemovals += patchRemovals;
    totalAdditions += patchAdditions
  });

  htmlOutput += `<div class="flex justify-between text-xs font-mono px-2 py-1">`;
  if (showPath) htmlOutput += ` <div class="text-lab-general-text-muted">${path || 'N/A'}</div>`;
  if (!showPath && altPath) htmlOutput += ` <div class="text-lab-general-text-muted"><i class="fa fa-solid fa-file-circle-plus mr-2"></i>${altPath || 'N/A'}</div>`;
  htmlOutput += ` <div class="flex gap-1">`;
  htmlOutput += `     <div class="${diffColors.additive.text}">+${totalAdditions}</div>`;
  htmlOutput += `     <div class="${diffColors.subtractive.text}">-${totalRemovals}</div>`;
  htmlOutput += ` </div>`;
  htmlOutput += `</div>`;

  htmlOutput += patchDiffsHtml;

  return {
    path: path,
    html: htmlOutput,
    totalRemovals: totalRemovals,
    totalAdditions: totalAdditions
  } as FileChanges
}

export function handleDiff(curDiff: ZodSafeParseResult<{
  start_line: number;
  updated: string;
  original?: string | undefined;
  is_additive?: boolean | undefined;
}>, showPath: boolean, altPath?: string): DiffItem {
  const startLine = curDiff.data?.start_line || 1;
  const isAdditive = curDiff.data?.is_additive || false;

  let patchHtml = '';
  let patchAdditions = 0;
  let patchRemovals = 0;

  if (!isAdditive && curDiff.data?.original && curDiff.data?.updated) {
    const originalLines = curDiff.data?.original.split('\n').filter((l: string) => l.trim());
    const updatedLines = curDiff.data?.updated.split('\n').filter((l: string) => l.trim());

    patchRemovals += originalLines.length;
    patchAdditions += updatedLines.length;

    if (originalLines.length > 0) {
      patchHtml += addDiffLines(false, startLine, 0, originalLines, showPath, altPath);
    }
    if (updatedLines.length > 0) {
      patchHtml += addDiffLines(true, startLine, originalLines.length, updatedLines, showPath, altPath);
    }
  }
  else if (isAdditive && curDiff.data?.updated) {
    const addedLines = curDiff.data?.updated.split('\n').filter((l: string) => l.trim());
    patchAdditions += addedLines.length;
    patchHtml += addDiffLines(true, startLine, 0, addedLines, showPath, altPath);
  }

  return {
    html: patchHtml,
    patchRemovals: patchRemovals,
    patchAdditions: patchAdditions
  } as DiffItem
}

export function addDiffLines(isAdditive: boolean, startLine: number, originalLines: number, lines: string[], showPath: boolean, altPath?: string): string {
  void altPath;

  let diffHtml = ''

  if (showPath) {
    diffHtml += `<div class="flex flex-col font-mono max-h-[200px] overflow-auto">`
  } else {
    diffHtml += `<div class="flex flex-col font-mono">`
  }

  diffHtml += `<div class="flex-col overflow-x-hidden">`

  const lightBg = isAdditive ? diffColors.additive.light : diffColors.subtractive.light;
  const darkBg = isAdditive ? diffColors.additive.dark : diffColors.subtractive.dark;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = startLine + originalLines + i;
    const code = escapeHtml(lines[i])
    diffHtml += `<div class="flex text-xs">`
    diffHtml += `   <div class="w-[30px]! min-w-[30px]! max-w-[30px]! ${lightBg} pl-1 pr-1">${lineNumber}</div>`
    diffHtml += `   <div class="w-[20px]! min-w-[20px]! max-w-[20px]! text-right ${lightBg} pl-1 pr-1">${isAdditive ? '+' : '-'}</div>`
    diffHtml += `   <div class="w-full h-full ${darkBg} pl-1 pr-1">${code.length > 0 ? code.replace(/\s/g, '&nbsp;') : '&nbsp;'}</div>`
    diffHtml += `</div>`
  }

  diffHtml += `</div></div>`
  return diffHtml;
}

// Helper function to escape HTML
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function handleDocumentorDiffs(
  paramsResult: ZodSafeParseResult<{
    path: string;
    content?: string;
    overwrite?: boolean;
    diffs?: {
      start_line: number;
      updated: string;
      original?: string;
      is_additive?: boolean;
    }[];
    operation?: string;
  }>
): FileOperations {
  const path = paramsResult.data?.path;
  const content = paramsResult.data?.content;
  const diffs = paramsResult.data?.diffs;
  const operation = paramsResult.data?.operation;

  // Validate that required fields exist
  if (!path) {
    return {
      path: '',
      html: '<div class="text-red-400">Path is required</div>',
      totalRemovals: 0,
      totalAdditions: 0,
      type: 'create'
    } as FileOperations;
  }

  let patchHtml = '';
  let totalAdditions = 0;
  let totalRemovals = 0;

  // Process diffs if provided - use validated data directly (matching old working version)
  if (diffs && Array.isArray(diffs) && diffs.length > 0) {
    diffs.forEach((patch: unknown) => {
      const curDiff = diffSchemaFields.safeParse(patch);
      if (curDiff.success) {
        const { html: patchHtmlResult, patchRemovals, patchAdditions } = handleDiff(curDiff, false, path) as DiffItem;
        patchHtml += patchHtmlResult;
        totalRemovals += patchRemovals;
        totalAdditions += patchAdditions;
      }
    });
  }

  // For save_document operations, we can include content preview
  if (operation === 'save_document' && content) {
    const lines = content.split('\n');
    const previewLines = lines.slice(0, 3).join('\n');
    patchHtml += `<div class="text-lab-general-text-muted text-xs">Content preview:<br><code class="bg-lab-general-bg-muted px-2 py-1 rounded">${escapeHtml(previewLines)}</code></div>`;
  }

  // Handle update_document operation - show diff statistics and summary
  if (operation === 'update_document') {
    patchHtml += `<div class="text-lab-general-text-muted text-xs mt-2">`;
    patchHtml += `<div>File: <code class="bg-lab-general-bg-muted px-1 rounded">${path}</code></div>`;
    if (totalAdditions > 0) {
      patchHtml += `<div class="text-green-400">+${totalAdditions} line(s) added</div>`;
    }
    if (totalRemovals > 0) {
      patchHtml += `<div class="text-red-400">-${totalRemovals} line(s) removed</div>`;
    }
    patchHtml += `</div>`;
  }

  // Handle get_line_content operation - show line content with context
  if (operation === 'get_line_content') {
    const lineData = JSON.parse(content || '{}');
    if (lineData && typeof lineData === 'object') {
      patchHtml += `<div class="text-lab-general-text-muted text-xs mt-2">`;
      patchHtml += `<div>Line: <code class="bg-lab-general-bg-muted px-1 rounded">${lineData.line}</code></div>`;
      patchHtml += `<div class="font-semibold text-lab-general-text mt-1">Content:</div>`;
      patchHtml += `<div class="bg-lab-general-bg-muted p-2 rounded max-h-[80px] overflow-auto whitespace-pre-wrap">${escapeHtml(lineData.content || 'N/A')}</div>`;

      if (lineData.context) {
        const ctx = lineData.context as Record<string, unknown>;
        patchHtml += `<div class="text-lab-general-text-muted mt-1">Context (${String(ctx.start_line)}-${String(ctx.end_line)}):</div>`;
        patchHtml += `<div class="bg-lab-general-bg-muted p-2 rounded max-h-[60px] overflow-auto text-[10px]">${escapeHtml(String(ctx.preview ?? 'N/A'))}</div>`;
      }
      patchHtml += `</div>`;
    }
  }

  // Handle get_diff_template operation - show generated template info
  if (operation === 'get_diff_template') {
    const templateData = JSON.parse(content || '{}');
    if (templateData && typeof templateData === 'object') {
      patchHtml += `<div class="text-lab-general-text-muted text-xs mt-2">`;
      patchHtml += `<div>File: <code class="bg-lab-general-bg-muted px-1 rounded">${path}</code></div>`;
      if (templateData.start_line) {
        patchHtml += `<div>Line range: ${templateData.start_line}-${templateData.end_line} of ${templateData.total_lines || templateData.lines || 'N/A'}</div>`;
      }
      patchHtml += `</div>`;
    }
  }

  const type = operation === 'save_document' ? 'create' : 'update';

  return {
    path: path,
    html: patchHtml,
    totalRemovals: totalRemovals,
    totalAdditions: totalAdditions,
    type: type
  } as FileOperations;
}

export function handleRemoveFile(toolResultContainerClasses: string,
  params: ZodSafeParseResult<{
  path: string;
  recursive: boolean;
  force: boolean;
}>, showPath: boolean, altPath?: string): FileChanges {

  const path = params.data?.path;

  let htmlOutput = `<div class="${toolResultContainerClasses}">`;

  htmlOutput += `<div class="flex justify-between text-xs font-mono px-2 py-1">`;
  if (showPath) htmlOutput += ` <div class="text-lab-general-text-muted">${path || 'N/A'}</div>`;
  if (!showPath && altPath) htmlOutput += ` <div class="text-lab-general-text-muted"><i class="fa fa-solid fa-file-circle-minus mr-2"></i>${altPath || 'N/A'}</div>`;
  htmlOutput += ` <div class="flex gap-1">`;
  htmlOutput += `     <div class="${diffColors.additive.text}">+0</div>`;
  htmlOutput += `     <div class="${diffColors.subtractive.text}">-0</div>`;
  htmlOutput += ` </div>`;
  htmlOutput += `</div>`;

  return {
    path: path,
    html: htmlOutput,
    totalRemovals: 0,
    totalAdditions: 0
  } as FileChanges
}