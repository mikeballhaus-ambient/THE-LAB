// UI Automation Tool Result Formatter
// Formats UI automation tool results for display in the dashboard

import { MCPToolCall, MCPToolResponse, UIAutomationOperation, UIDiscoveryElement } from '../../../../shared/types';
import { escapeHtml } from './base-utils';
import { formatDefaultResult } from './default-result';
import { parseDiscoverElementsFromToolContent } from '@/shared/utils/ui-automation-discover-content';

function parseToolArguments(toolCall: MCPToolCall): Record<string, unknown> {
  const raw = toolCall.function.arguments;
  if (raw == null || raw === '') {
    return {};
  }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function isDiscoverTool(toolCall: MCPToolCall, params: Record<string, unknown>): boolean {
  return (
    toolCall.function.name === 'ui_automation_discover_elements' ||
    params.operation === UIAutomationOperation.DISCOVER_ELEMENTS
  );
}

function isElementActionTool(toolCall: MCPToolCall, params: Record<string, unknown>): boolean {
  return (
    toolCall.function.name === 'ui_automation_element_action' ||
    params.operation === UIAutomationOperation.ELEMENT_ACTION
  );
}

export function formatUiAutomationToolResult(
  toolResultContainerClasses: string,
  toolCall: MCPToolCall,
  toolResult: MCPToolResponse
): string {
  const params = parseToolArguments(toolCall);

  if (isDiscoverTool(toolCall, params)) {
    const content = toolResult.content || '';

    let elementsHtml = '';
    try {
      const { elements: elementsData, parseError, truncatedListing } =
        parseDiscoverElementsFromToolContent(content);

      if (!parseError && elementsData.length > 0) {
          elementsHtml = `<div class="elements-list">
            <h4>Discovered ${elementsData.length} Elements</h4>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
              <thead>
                <tr class="bg-lab-general-bg-muted">
                  <th>Tag</th>
                  <th>ID</th>
                  <th>Classes</th>
                  <th>Text Content</th>
                  <th>Position</th>
                  <th>Interactive</th>
                  <th>Visible</th>
                  <th>Context Area</th>
                  <th>uiRole</th>
                  <th>target</th>
                </tr>
              </thead>
              <tbody>
                ${elementsData.map((el: UIDiscoveryElement) => `
                  <tr>
                    <td>${escapeHtml(el.tag)}</td>
                    <td>${escapeHtml(el.id || '-')}</td>
                    <td>${escapeHtml(Array.isArray(el.className) ? el.className.join(' ') : '-')}</td>
                    <td>${escapeHtml(el.textContent || '-')}</td>
                    <td>${el.position ? `${el.position.x},${el.position.y}` : '-'}</td>
                    <td>${el.isInteractive ? '✓' : '✗'}</td>
                    <td>${el.isVisible ? '✓' : '✗'}</td>
                    <td>${escapeHtml(el.contextArea || '-')}</td>
                    <td>${escapeHtml(el.uiRole || '-')}</td>
                    <td>${escapeHtml(el.target)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>${truncatedListing ? `<p class="text-xs mt-2">${escapeHtml(truncatedListing)}</p>` : ''}`;
      } else if (!parseError && elementsData.length === 0) {
        elementsHtml = `<p>No elements found matching the discovery criteria.</p>`;
      } else if (content.trim()) {
        const hint = parseError
          ? `Could not parse element JSON (${escapeHtml(parseError)}). Raw tool output:`
          : 'Raw tool output:';
        elementsHtml = `<p class="text-xs">${hint}</p><pre class="text-xs whitespace-pre-wrap max-h-48 overflow-auto">${escapeHtml(content.slice(0, 4000))}</pre>`;
      } else {
        elementsHtml = `<p>Unable to parse element data from response.</p>`;
      }
    } catch (error) {
      elementsHtml = `<p>Error parsing element data: ${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>`;
    }

    const contextArea =
      typeof params.contextArea === 'string' && params.contextArea.trim()
        ? params.contextArea
        : '(default)';
    const searchPattern =
      typeof params.searchPattern === 'string' && params.searchPattern.trim()
        ? params.searchPattern
        : '(none)';

    return `<div class="${toolResultContainerClasses}">
      <div>Operation: discoverElements</div>
      <div>Context area: ${escapeHtml(contextArea)}</div>
      <div>searchPattern: ${escapeHtml(searchPattern)}</div>
      <div>Status: ${toolResult.success ? 'completed' : 'failed'}</div>
      ${elementsHtml}
    </div>`;
  }

  if (isElementActionTool(toolCall, params)) {
    const content = toolResult.content || '';
    const actions = Array.isArray(params.actions) ? params.actions : [];
    const isBatch = actions.length > 1;

    let detailsHtml = '';
    try {
      const successMatch = content.match(/Action executed successfully\./);
      if (successMatch && toolResult.success) {
        detailsHtml = `<div class="action-success">
          <p><strong>✓ Action completed successfully</strong></p>
          ${isBatch ? `<p><em>Batch mode: ${actions.length} actions queued</em></p>` : ''}
          <p>${escapeHtml(content)}</p>
        </div>`;
      } else if (!successMatch && !toolResult.success) {
        detailsHtml = `<div class="action-failure">
          <p><strong>✗ Action failed</strong></p>
          ${isBatch ? `<p><em>Batch mode: ${actions.length} actions queued</em></p>` : ''}
          <p>${escapeHtml(content)}</p>
        </div>`;
      } else {
        detailsHtml = `<p>${escapeHtml(content)}</p>`;
      }
    } catch (error) {
      detailsHtml = `<p>Error processing action result: ${escapeHtml(error instanceof Error ? error.message : 'Unknown error')}</p>`;
    }

    return `<div class="${toolResultContainerClasses}">
      <div>Operation: elementAction</div>
      <div>Status: ${toolResult.success ? 'success' : 'failed'}</div>
      ${isBatch ? `<div><strong>Batch Mode:</strong> ${actions.length} actions executed</div>` : ''}
      ${detailsHtml}
    </div>`;
  }

  return formatDefaultResult(toolResultContainerClasses, toolCall, toolResult);
}
