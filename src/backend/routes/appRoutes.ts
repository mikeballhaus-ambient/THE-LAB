import type { Socket as RawSocket } from 'socket.io';
import { ChatInitializedData, SOCKET_EVENTS } from '../../shared/types';
import { ProviderService } from '../ai/provider-service';
import { ConversationMemory, getChromaMemoryHealth } from '../chroma/conversation-memory';
import MCPToolRegistry from '../mcp/mcp-tool';
import { evaluateExternalMcpEnvGaps } from '../../shared/config/lab-external-mcp-env-health.node';
import appsService from '../db/Apps/apps-service';
import type { RuntimeApp } from '../../shared/types';
import type { AppSocketRouteContext } from './app-socket/deps';
import { registerChatSocketRoutes } from './chat/chat-socket-routes';
import { registerSessionSocketRoutes } from './session/session-socket-routes';
import { registerSettingsSocketRoutes } from './settings/settings-socket-routes';
import { registerMcpSocketRoutes } from './mcp-socket/mcp-socket-routes';

export async function initAppRoutes(
  socket: RawSocket,
  providerService: ProviderService,
  memory: ConversationMemory,
  mcpRegistry: MCPToolRegistry,
): Promise<void> {
  void mcpRegistry;

  const providerData = providerService.getProviderData();
  const appsWithTags = appsService.getAllAppsWithCatalogTags() as RuntimeApp[];
  providerData.apps = appsWithTags;
  providerService.setProviderData(providerData);

  await providerService.dispatchUIResponse(SOCKET_EVENTS.CHAT_INITIALIZED, {
    ready: true,
    llmProviderConfig: providerService.getConfig(),
    providers: providerData.aiProviders,
    globalSysMsg: providerData.sysMsg,
    repoFiles: providerData.repoFiles,
    apps: appsWithTags,
    memoryHealth: getChromaMemoryHealth(),
    externalMcpEnvGaps: evaluateExternalMcpEnvGaps(),
  } as ChatInitializedData);

  const ctx: AppSocketRouteContext = {
    socket,
    providerService,
    memory,
    mcpRegistry,
  };

  registerChatSocketRoutes(ctx);
  registerSessionSocketRoutes(ctx);
  registerSettingsSocketRoutes(ctx);
  registerMcpSocketRoutes(ctx);
}
