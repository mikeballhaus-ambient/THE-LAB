import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  discoverElementsSchemaFields,
  elementActionSchemaFields,
  UIDiscoveryResponseData,
  UIElementActionResponseData
} from '../../../../shared/types';

// 1. Initialize the native UI Automation Server
export const uiAutomationMcpServer = new McpServer({
  name: 'system-ui-automation-server',
  version: '1.0.0',
});

import { ProviderService } from '../../../ai/provider-service';
import { SOCKET_EVENTS } from '../../../../shared/types';
import { runUiAutomationSocketExclusive } from '../../utils/ui-automation-socket-queue';
import { buildUiAutomationDiscoverToolMessage } from '../../../../shared/utils/ui-automation-discover-content';
import {
  LAB_RECORD_AUTOMATION_GUIDANCE,
  LAB_SHELL_UI_AUTOMATION_CATALOG_GUIDANCE,
} from '../../../../shared/constants/lab-shell-ui-automation';

// ==========================================
// TOOL 1: Discover Elements
// ==========================================
const discoverElementsDescription = `Discovers interactive UI elements in the Lab dashboard or a mounted app. Returns tag, id, classes, text, data-* attributes, position, and a CSS \`target\` selector (includes \`data-appname\` on catalog Launch buttons).

${LAB_SHELL_UI_AUTOMATION_CATALOG_GUIDANCE}

${LAB_RECORD_AUTOMATION_GUIDANCE}

Use \`searchPattern\` as a **plain substring** (case-insensitive) — e.g. catalog app name, \`app-lab-workflow-studio\`, or a **record title** (workflow / policy name) for list edit buttons. **Multi-word patterns** are split into tokens (layout noise like \`header\` / \`toolbar\` / \`button\` dropped); a control matches if **any** token hits its label, \`aria-label\`, or attrs — so \`cancel back exit close\` still finds **Cancel**. Prefer one strong token (\`cancel\`) when possible. Matches \`data-lab-record-name\`, \`aria-label\`, and other \`data-*\` — icon-only row actions often have no visible text. Do **not** pass full CSS selectors; quoted values inside selectors are extracted. Each row includes **\`elementRef\`** and **\`uiRole\`**: \`catalog-launch\`, \`catalog-pin\`, \`catalog-edit-tags\`, or \`catalog-tag-filter\` (apps home), \`record-action\` (edit/delete/create via \`data-lab-record-*\`). In \`app-list-container\`, discovery is limited to launch/pin/tags/toolbar and category filter chips. Inside a mounted app, scope \`contextArea\` to the app root class (e.g. \`lab-workflow-studio-app\`). Paginate with \`skip\` + \`maxResults\` (default 25). Every result includes a **Discover pagination:** block: if it says **MORE MATCHES EXIST**, rerun with the exact \`skip=\` shown (same \`contextArea\` and \`searchPattern\`). Compare \`totalCount\` to rows in the JSON — they differ when more pages remain.`;

uiAutomationMcpServer.registerTool(
  'ui_automation_discover_elements',
  {
    description: discoverElementsDescription,
    inputSchema: discoverElementsSchemaFields,
  },
  async ({ sessionId, persona, searchPattern, maxResults, skip, contextArea }) => {
    return runUiAutomationSocketExclusive(async () => {
    try {
      const providerService = ProviderService.getInstance();
      const socket = providerService.getSocketConnection();

      if (!socket) {
        return {
          content: [{ type: 'text' as const, text: 'Warning: Unable to discover elements because the socket server is not ready.' }],
          isError: true,
        };
      }

      const data = {
        sessionId,
        persona,
        searchPattern,
        maxResults,
        skip,
        contextArea,
      };

      const uiResponsePromise = new Promise<{ content: Array<{ type: 'text'; text: string }>, isError: boolean }>((resolve) => {
        let resolved = false;
        socket.once(SOCKET_EVENTS.UI_AUTOMATION_DISCOVER_RESPONSE, async (uiData: UIDiscoveryResponseData) => {
          if (resolved) return;
          resolved = true;

          try {
            let responseMessage: string = '';

            responseMessage = buildUiAutomationDiscoverToolMessage(
              uiData.elements ?? [],
              uiData.totalCount ?? 0,
              {
                searchPattern: uiData.searchPattern,
                contextArea: uiData.contextArea,
                skip: uiData.skip,
                maxResults: uiData.maxResults,
                resultMessage: uiData.resultMessage,
              },
            );

            resolve({ content: [{ type: 'text' as const, text: responseMessage }], isError: false });
          } catch (error) {
            resolve({
              content: [{ type: 'text' as const, text: `Error processing discovery response: ${error instanceof Error ? error.message : 'Unknown error'}` }],
              isError: true,
            });
          }
        });
      });

      socket.emit(SOCKET_EVENTS.UI_AUTOMATION_DISCOVER_REQUEST, data);

      return await uiResponsePromise
    } catch (error: unknown) {
      return {
        content: [{ type: 'text' as const, text: `Error processing discovery response: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        isError: true,
      }
    }
    });
  }
);

// ==========================================
// TOOL 2: Element Action (Batch Actions)
// ==========================================
const elementActionDescription = `Performs batch actions on UI elements. **Prefer \`elementRef\`** copied from the matching \`ui_automation_discover_elements\` row (same discover pass). \`target\` from discovery is a fallback when refs are unavailable. Supports click, doubleClick, hover, focus, blur, press, setValue, setAttribute, removeAttribute. Actions execute sequentially with the specified order.`;

uiAutomationMcpServer.registerTool(
  'ui_automation_element_action',
  {
    description: elementActionDescription,
    inputSchema: elementActionSchemaFields,
  },
  async ({ actions }) => {
    return runUiAutomationSocketExclusive(async () => {
    const providerService = ProviderService.getInstance();
    const socket = providerService.getSocketConnection();

    if (!socket) {
      return {
        content: [{ type: 'text' as const, text: 'Warning: Unable to execute batch actions because the socket server is not ready.' }],
        isError: true,
      };
    }

    if (!actions || actions.length === 0) {
      return {
        content: [{ type: 'text' as const, text: 'Warning: actions array must contain at least one action.' }],
        isError: true,
      };
    }

    const uiResponsePromise = new Promise<{ content: Array<{ type: 'text'; text: string }>, isError: boolean }>((resolve) => {
      let resolved = false;
      socket.once(SOCKET_EVENTS.UI_AUTOMATION_ACTION_RESPONSE, async (uiData: UIElementActionResponseData) => {
        if (resolved) return;
        resolved = true;

        try {
          let responseMessage: string = '';
          let successResult: boolean = false;
          const resultActions = uiData.results ? uiData.results : [];

          if (uiData.success) {
            responseMessage += 'Batch execution completed successfully';
            successResult = uiData.success;
          } else {
            const totalActions = actions.length;
            const successfulActions = resultActions.filter(r => r.success).length;
            const failedActions = resultActions.filter(r => !r.success);
            successResult = successfulActions > 0;

            if (successfulActions === totalActions) {
              responseMessage += `Successfully executed ${totalActions} batch actions.`;
            } else if (successfulActions > 0) {
              const failureDetails = failedActions.length > 0 ? `\nFailed actions:\n${JSON.stringify(failedActions, null, 2)}` : '';
              responseMessage += `Executed ${successfulActions} actions successfully however ${totalActions} actions failed. Failure details: ${failureDetails}`;
            } else {
              const failureDetails = resultActions.length > 0 ? `\nAll actions failed:\n${JSON.stringify(resultActions, null, 2)}` : '';
              responseMessage += `All ${totalActions} batch actions failed.${failureDetails}`;
            }
          }

          resolve({ content: [{ type: 'text' as const, text: responseMessage }], isError: !successResult });
        } catch {
          resolve({
            content: [{ type: 'text' as const, text: `Warning: Unable to execute batch actions because the socket server is not ready.` }],
            isError: true,
          });
        }
      });
    });

    socket.emit(SOCKET_EVENTS.UI_AUTOMATION_ACTION_REQUEST, { actions });

    return await uiResponsePromise
    });
  }
);

// ==========================================
// 3. Export Manifest Definitions For Registry Mapping
// ==========================================
export const uiAutomationToolsManifest = [
  {
    id: 'ui_automation_discover_elements',
    name: 'UI Automation - Discover Elements',
    description: discoverElementsDescription,
    params: discoverElementsSchemaFields,
  },
  {
    id: 'ui_automation_element_action',
    name: 'UI Automation - Element Action',
    description: elementActionDescription,
    params: elementActionSchemaFields,
  },
];
