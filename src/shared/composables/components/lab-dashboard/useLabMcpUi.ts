import { type Ref } from 'vue';
import type { ToastServiceMethods } from 'primevue/toastservice';
import type { Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type IMCPServerConfig,
  type MCPServerUpdateEventData,
  type McpStdioAccessPayload,
  type McpStdioAccessUpdatedEventData,
  type ToolsList,
  type User,
} from '@/shared/types';

export interface UseLabMcpUiOptions {
  socketConnection: Ref<Socket | null>;
  user: Ref<User | null>;
  getCurrentUserId: () => number | undefined;
  toast: ToastServiceMethods;
  mcpServers: Ref<IMCPServerConfig[]>;
  mcpStdioAccess: Ref<McpStdioAccessPayload>;
  availableTools: Ref<ToolsList[]>;
  initMcpFormatter: (toolsList: ToolsList[]) => void;
}

/** MCP server settings UI + stdio access socket emits (rm-46 **4.2**). */
export function useLabMcpUi(options: UseLabMcpUiOptions) {
  const {
    socketConnection,
    user,
    getCurrentUserId,
    toast,
    mcpServers,
    mcpStdioAccess,
    availableTools,
    initMcpFormatter,
  } = options;

  const mcpServersUpdated = (data: MCPServerUpdateEventData) => {
    if (data.mcpServersUpdate) {
      const sortedTools = [...data.tools].sort((a: ToolsList, b: ToolsList) => {
        const aProp = a.display || a.name || '';
        const bProp = b.display || b.name || '';
        return aProp.localeCompare(bProp);
      });
      mcpServers.value = data.mcpServersUpdate;
      availableTools.value = sortedTools;
      initMcpFormatter(sortedTools);
    }
  };

  const saveMcpServerConfig = (data: {
    server: IMCPServerConfig;
    action: 'add' | 'update' | 'remove';
    serverId?: number;
  }) => {
    if (!socketConnection.value) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.UPDATE_MCP_SERVER, {
      userId: getCurrentUserId(),
      action: data.action,
      server: data.server,
    });
    toast.add({
      severity: 'success',
      summary: 'Settings Saved',
      detail: 'MCP server configurations saved',
      life: 3000,
    });
    switch (data.action) {
      case 'add': {
        mcpServers.value.push(data.server);
        break;
      }
      case 'remove': {
        const index = mcpServers.value.findIndex((s) => s.id === data.serverId);
        if (index !== -1) {
          mcpServers.value.splice(index, 1);
        }
        break;
      }
    }
  };

  const toggleMcpServer = (serverId: number) => {
    if (!socketConnection.value || !user.value) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.TOGGLE_MCP_SERVER, {
      userId: user.value.userId,
      serverId,
    });
  };

  const mcpStdioAccessUpdated = (data: McpStdioAccessUpdatedEventData) => {
    mcpStdioAccess.value = data;
  };

  const requestMcpStdioAccess = (serverId: number, note?: string) => {
    if (!socketConnection.value || !user.value) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.MCP_STDIO_ACCESS, {
      userId: user.value.userId,
      action: 'request',
      serverId,
      note,
    });
  };

  const reviewMcpStdioAccess = (requestId: number, action: 'approve' | 'deny') => {
    if (!socketConnection.value || !user.value) {
      return;
    }
    socketConnection.value.emit(SOCKET_EVENTS.MCP_STDIO_ACCESS, {
      userId: user.value.userId,
      action,
      requestId,
    });
  };

  return {
    mcpServersUpdated,
    saveMcpServerConfig,
    toggleMcpServer,
    mcpStdioAccessUpdated,
    requestMcpStdioAccess,
    reviewMcpStdioAccess,
  };
}
