import {
  SOCKET_EVENTS,
  SocketErrorEvent,
  IMCPServerConfig,
  MCPServerUpdateEventData,
  McpStdioAccessEventData,
  McpStdioAccessUpdatedEventData,
} from '../../../shared/types';
import { MCPServerLoader, mcpServerLoader } from '../../mcp/mcp-server-loader';
import { VSCodeLogger } from '../../utils/logger';
import { mcpServersService } from '../../db/MCPServers/mcp-servers-service';
import userService from '../../db/Auth/auth-service';
import { mcpStdioAccessService } from '../../db/MCPStdioAccess/mcp-stdio-access-service';
import { getMcpLoadPayload } from '../utils/auth-routes-utils';
import { platformAuditService } from '../../db/PlatformAudit/platform-audit-service';
import type { AppSocketRouteContext } from '../app-socket/deps';
import { canToggleSeededMcpServer, isSeededMcpServerName } from '../../../shared/config/default-mcp-servers';
/** MCP server CRUD, toggle, stdio access approval (rm-46 **4.1**). */
export function registerMcpSocketRoutes(ctx: AppSocketRouteContext): void {
  const { socket, providerService } = ctx;

  socket.on(
    SOCKET_EVENTS.UPDATE_MCP_SERVER,
    async (data: {
      userId: number;
      action: 'add' | 'update' | 'remove';
      server: IMCPServerConfig;
    }) => {
      try {
        const userId = data.userId;
        if (!userId) {
          return;
        }
        data.server.userId = userId;
        let allServersForUser = mcpServersService.getAllMCPServers(userId);
        const loader = mcpServerLoader.getInstance(userId);

        switch (data.action) {
          case 'add': {
            if (data.server.transport == 'stdio') {
              const ALLOWED_COMMANDS = ['npx', 'python', 'node', 'npm', 'cmd.exe'];
              if (!data.server.command || !ALLOWED_COMMANDS.includes(data.server.command)) {
                await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
                  message: 'Invalid command. Only npx, python, node, npm, cmd.exe are allowed.',
                } as SocketErrorEvent);
                return;
              }
            }

            const newServerConfig: IMCPServerConfig = {
              ...data.server,
              userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const serverId = mcpServersService.addMCPServer(newServerConfig);

            platformAuditService.record({
              actorUserId: userId,
              category: 'mcp_server',
              action: 'add',
              targetType: 'mcp_server',
              targetId: String(serverId),
              details: { name: data.server.name, transport: data.server.transport },
            });

            await loader.loadServer({ ...newServerConfig, id: serverId });

            allServersForUser = mcpServersService.getAllMCPServers(userId);
            break;
          }
          case 'update': {
            const serverIndex = allServersForUser.findIndex((s) => s.id === data.server.id);

            if (serverIndex !== -1) {
              if (data.server.command && data.server.command !== allServersForUser[serverIndex].command) {
                const ALLOWED_COMMANDS = ['npx', 'python', 'node', 'npm'];
                if (!ALLOWED_COMMANDS.includes(data.server.command)) {
                  await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
                    message: 'Invalid command. Only npx, python, node, npm are allowed.',
                  } as SocketErrorEvent);
                  return;
                }
              }

              const updatedServer = {
                ...allServersForUser[serverIndex],
                ...data.server,
                updated_at: new Date().toISOString(),
              };

              mcpServersService.updateMCPServer(data.server.id, updatedServer);

              platformAuditService.record({
                actorUserId: userId,
                category: 'mcp_server',
                action: 'update',
                targetType: 'mcp_server',
                targetId: String(data.server.id),
                details: { name: updatedServer.name, enabled: updatedServer.enabled },
              });

              if (data.server.enabled !== undefined) {
                if (data.server.enabled) {
                  await loader.loadServer(updatedServer);
                } else {
                  await loader.unloadServer(data.server.id);
                }
              }

              allServersForUser[serverIndex] = updatedServer;
            }
            break;
          }
          case 'remove': {
            if (data.server.id) {
              await loader.unloadServer(data.server.id);

              mcpServersService.deleteMCPServer(userId, data.server.id);
              platformAuditService.record({
                actorUserId: userId,
                category: 'mcp_server',
                action: 'remove',
                targetType: 'mcp_server',
                targetId: String(data.server.id),
                details: { name: data.server.name },
              });
              allServersForUser = mcpServersService.getAllMCPServers(userId);
            }
            break;
          }
        }

        const resolvedTools = MCPServerLoader.resolveAllToolsForUI(userId);
        await providerService.dispatchUIResponse(
          SOCKET_EVENTS.UPDATE_MCP_SERVER,
          resolvedTools as MCPServerUpdateEventData,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const logger = await VSCodeLogger.getInstance();
        logger.error(`Failed to update MCP server configuration for user ${data.userId}: ${message}`);
        await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
          message: `Failed to update MCP server: ${message}`,
        } as SocketErrorEvent);
      }
    },
  );

  socket.on(SOCKET_EVENTS.TOGGLE_MCP_SERVER, async (data: { userId: number; serverId: number }) => {
    try {
      const userId = data.userId;
      if (!userId) {
        return;
      }

      const server = mcpServersService.getMCPServerConfig(data.userId, data.serverId);

      if (!server || server.userId !== userId) {
        await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
          message: 'Server not found or unauthorized',
        } as SocketErrorEvent);
        return;
      }

      const actor = userService.getUserById(userId);
      if (isSeededMcpServerName(server.name) && !canToggleSeededMcpServer(actor?.role)) {
        await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
          message: 'Only platform owners or admins can enable or disable built-in MCP servers.',
        } as SocketErrorEvent);
        return;
      }

      const newEnabledStatus = !server.enabled;

      mcpServersService.toggleMCPServerEnabled(data.userId, data.serverId);

      platformAuditService.record({
        actorUserId: userId,
        category: 'mcp_server',
        action: 'toggle_enabled',
        targetType: 'mcp_server',
        targetId: String(data.serverId),
        details: { enabled: newEnabledStatus, name: server.name },
      });

      const allServersForUser = mcpServersService.getAllMCPServers(userId);
      const serverIndex = allServersForUser.findIndex((s) => s.id === data.serverId);
      if (serverIndex !== -1) {
        allServersForUser[serverIndex] = { ...allServersForUser[serverIndex], enabled: newEnabledStatus };
      }

      const loader = mcpServerLoader.getInstance(userId);
      if (newEnabledStatus) {
        await loader.loadServer(allServersForUser[serverIndex]);
      } else {
        await loader.unloadServer(data.serverId);
      }

      const resolvedTools = MCPServerLoader.resolveAllToolsForUI(userId);
      await providerService.dispatchUIResponse(
        SOCKET_EVENTS.UPDATE_MCP_SERVER,
        resolvedTools as MCPServerUpdateEventData,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const logger = await VSCodeLogger.getInstance();
      logger.error(`Failed to toggle MCP server for user ${data.userId}: ${message}`);
      await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
        message: `Failed to toggle MCP server: ${message}`,
      } as SocketErrorEvent);
    }
  });

  socket.on(SOCKET_EVENTS.MCP_STDIO_ACCESS, async (data: McpStdioAccessEventData) => {
    try {
      const userId = data.userId;
      if (!userId) {
        return;
      }
      const user = userService.getUserById(userId);
      if (!user) {
        await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
          message: 'User not found for stdio access request.',
        } as SocketErrorEvent);
        return;
      }

      if (data.action === 'request') {
        if (data.serverId == null) {
          await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
            message: 'serverId is required to request stdio MCP access.',
          } as SocketErrorEvent);
          return;
        }
        const result = mcpStdioAccessService.requestAccess(userId, data.serverId, data.note);
        if (!result.success) {
          await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, { message: result.content } as SocketErrorEvent);
          return;
        }
      } else if (data.action === 'approve' || data.action === 'deny') {
        if (data.requestId == null) {
          await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
            message: 'requestId is required to review stdio access.',
          } as SocketErrorEvent);
          return;
        }
        const result = mcpStdioAccessService.reviewRequest(user, data.requestId, data.action);
        if (!result.success) {
          await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, { message: result.content } as SocketErrorEvent);
          return;
        }
      } else {
        return;
      }

      const payload = getMcpLoadPayload(userId).stdioAccess;
      if (payload) {
        await providerService.dispatchUIResponse(
          SOCKET_EVENTS.MCP_STDIO_ACCESS_UPDATED,
          payload as McpStdioAccessUpdatedEventData,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const logger = await VSCodeLogger.getInstance();
      logger.error(`MCP stdio access handler failed: ${message}`);
      await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
        message: `Stdio MCP access update failed: ${message}`,
      } as SocketErrorEvent);
    }
  });
}
