import fastify from 'fastify';

import { fileHelpers } from './utils/file-helpers';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import { assertProductionCorsConfig, resolveLabCorsOptions, resolveSocketIoCorsOptions } from './auth/lab-cors';
import { resolveLabAppServiceToken } from '@/shared/server/lab-app-service-token';
import { AppManager } from './AppManager';
import { initializeUserManagementHandlers } from './routes/authRoutes';
import { authSocketMiddleware, getRoleManager } from './middleware/auth';
import { registerHttpAuthRoutes } from './routes/httpAuthRoutes';
import { registerPlatformReadinessRoutes } from './routes/platform-readiness-routes';
import { registerRequestCorrelationMiddleware } from './middleware/request-correlation-middleware';
import { logLabServerEnvWarnings } from '@/shared/config/lab-server-env-schema';
import { isLabAppServerWarmupEnabled } from '@/shared/config/lab-app-server-warmup';
import { evaluateExternalMcpEnvGaps } from '@/shared/config/lab-external-mcp-env-health.node';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import { Server as HttpServer } from 'http';
import { ProviderService } from './ai/provider-service';
import { bootstrapChroma } from './chroma/chroma-bootstrap';
import { runKbChunksStartupReconcile } from './chroma/kb-chunks-reconcile';
import { ConversationMemory, getChromaMemoryHealth } from './chroma/conversation-memory';
import { allowChromaDegradedStartup } from '@/shared/config/lab-chroma-write';
import { setChromaMemoryUnavailable } from './chroma/chroma-memory-health';
import MCPToolRegistry from './mcp/mcp-tool';
import { registerDefaultPlatformStructuralTools } from './ai/structural-tools/platform-structural-tool-registry';
import {
  ChatInitializedData,
  SOCKET_EVENTS,
  ProviderData,
  FILE_PATHS
} from '../shared/types';
import { initEndPoints } from './routes/appEndPoints';
import { initAppRoutes } from './routes/appRoutes';
import { databaseManager } from './db/DatabaseManager';
import { registerDefaultPlatformAppsCatalog } from './platform/register-platform-apps-catalog';
import aiProviderService from './db/AIProvider/ai-provider-service';
import appsService from './db/Apps/apps-service';
import { toolsService } from './db/Tools/tools-service';
import { FormsBuilderUrlService } from './utils/forms-builder-url-service';
import { registerLabCommsSocket } from './comms/lab-comms-socket';
import { registerLabCommsMatchBroadcast } from './comms/lab-comms-match-broadcast';
import { registerLabEventsSocket } from './lab-events/lab-events-socket';
import {
  LAB_WORKFLOW_SCHEDULER_TICK_MS,
  labWorkflowScheduler,
} from './lab-workflows/lab-workflow-scheduler';
import { labRequirementSweeper } from './lab-workflows/lab-requirement-sweeper';
import { registerLabAppManager } from './services/lab-app-manager-registry';

// Initialize Fastify server with logging enabled
logLabServerEnvWarnings();
const server = fastify({ logger: true });

assertProductionCorsConfig();
resolveLabAppServiceToken();

// Register @fastify/cors plugin to enable CORS
await server.register(fastifyCors, resolveLabCorsOptions());
await server.register(fastifyCookie);
registerRequestCorrelationMiddleware(server);

let httpServer: HttpServer;
let io: SocketIOServer;

await databaseManager.initialize();
registerDefaultPlatformAppsCatalog();
const formsBuilderUrl = FormsBuilderUrlService.getInstance().initialize(appsService.getAllApps());
console.log(`[THE-LAB] Forms Builder URL: ${formsBuilderUrl}`);
const roleManager = getRoleManager();
type SocketWithRoleManager = Socket & { roleManager?: ReturnType<typeof getRoleManager> };
const setRoleManagerOnSocket = (socket: SocketWithRoleManager) => {
  socket.roleManager = roleManager;
};
const providerService: ProviderService = ProviderService.getInstance();

await providerService.init();

providerService.setProviderData({
  aiProviders: aiProviderService.getAllProviders(),
  mcpTools: toolsService.getAllTools(),
  repoFiles: await fileHelpers.fetchRepoFiles(),
  sysMsg: await fileHelpers.readFile(FILE_PATHS.SYSMSG_TEMPLATE),
  apps: appsService.getAllApps()
} as ProviderData)

const appManager = new AppManager(server.log as FastifyBaseLogger);
registerLabAppManager(appManager);

const initializeAppManager = async () => {
  try {
    await appManager.initialize();
    console.log('[AppManager] AppManager initialized successfully');
  } catch (err) {
    console.error('[AppManager] Failed to initialize AppManager:', err);
  }
};
await initializeAppManager();

const memory = ConversationMemory.getInstance();
const mcpRegistry = MCPToolRegistry.getInstance();

// Start the server
const start = async () => {
  await mcpRegistry.loadDefaultServers()
  // The persona Tools tab reads the `tools` catalogue table, not the live registry. Without this
  // reconcile, a newly registered MCP server (e.g. Workflow Studio, Knowledge Base) is callable by an
  // agent but unassignable in Settings — so keep the catalogue derived from what actually loaded.
  const catalogueCount = toolsService.syncRegisteredTools(
    mcpRegistry.getRegisteredTools().map((tool) => ({
      id: tool.id,
      name: tool.display || tool.name || tool.id,
      description: tool.description || '',
    })),
  )
  console.log(`[THE-LAB] Tool catalogue synced: ${catalogueCount} MCP tools`)
  registerDefaultPlatformStructuralTools();
  providerService.setMCPRegistry();
  registerHttpAuthRoutes(server);
  registerPlatformReadinessRoutes(server);
  initEndPoints(server, appManager);
  httpServer = server.server;
  io = new SocketIOServer(httpServer, {
    cors: resolveSocketIoCorsOptions(),
  });
  server.decorate('io', io);
  await server.ready();
  providerService.setSocketIOServer(io);
  await connectChromaWithRetry();
  io.use(authSocketMiddleware);
  io.use((socket, next) => {
    initializeUserManagementHandlers(socket);
    setRoleManagerOnSocket(socket);
    next();
  });
  registerLabCommsSocket(io);
  registerLabCommsMatchBroadcast(io);
  registerLabEventsSocket(io);
  io.on('connection', async (socket) => {
    await initAppRoutes(socket, providerService, memory, mcpRegistry);
    providerService.setSocketConnection(socket)
  });
  // One platform clock for every scheduled workflow (W8). Started after the listener so a slow
  // first tick cannot delay readiness; `unref` inside the scheduler keeps it from holding the
  // process open on shutdown.
  labWorkflowScheduler.start(LAB_WORKFLOW_SCHEDULER_TICK_MS, { io });

  // The time-derived requirement sweep rides the same interval rather than starting a second timer
  // (phase 33). A second interval would be a second clock to reason about, with its own drift, and
  // the whole reason the sweep exists is that per-thing timers are the anti-pattern. Each tick is
  // isolated internally, so a failing requirement cannot stop the schedule fires above.
  const requirementSweepTimer = setInterval(() => {
    void labRequirementSweeper.tick({ io }).catch((err) => {
      console.error('[lab-workflows] requirement sweep tick threw', err);
    });
  }, LAB_WORKFLOW_SCHEDULER_TICK_MS);
  requirementSweepTimer.unref?.();

  httpServer.listen(3000, async () => {
    console.log('Server listening on port 3000');
    console.log('Server started successfully (single instance)'); // Debug log

    if (isLabAppServerWarmupEnabled()) {
      void appManager
        .warmUpEnabledAppServers()
        .then(() => runKbChunksStartupReconcile({ phase: 'post-warmup' }))
        .catch((err) => {
          console.error('[AppManager] warm-up failed:', err);
        });
    } else {
      console.log('[AppManager] app server warm-up disabled (LAB_APP_SERVER_WARMUP=0)');
      void runKbChunksStartupReconcile({ phase: 'post-warmup' }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[kb-rag] startup reconcile (post-warmup) failed: ${message}`);
      });
    }

    const providerData = providerService.getProviderData();
    await providerService.dispatchUIResponse(SOCKET_EVENTS.CHAT_INITIALIZED, {
      ready: true,
      llmProviderConfig: providerService.getConfig(),
      globalSysMsg: providerData.sysMsg,
      repoFiles: providerData.repoFiles,
      apps: providerData.apps,
      memoryHealth: getChromaMemoryHealth(),
      externalMcpEnvGaps: evaluateExternalMcpEnvGaps(),
    } as ChatInitializedData);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    try {
      labWorkflowScheduler.stop();
      clearInterval(requirementSweepTimer);
      await server.close();
      httpServer.close();
      console.log('Server closed gracefully');
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
};

const sleepMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const connectChromaWithRetry = async (): Promise<void> => {
  const MAX_RETRIES = 20;
  const INITIAL_DELAY_MS = 2500;
  const RETRY_DELAY_MS = 500;
  const started = Date.now();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const delayMs = attempt === 1 ? INITIAL_DELAY_MS : RETRY_DELAY_MS;
    console.log(
      `[Chroma] Waiting ${delayMs}ms before connect attempt ${attempt}/${MAX_RETRIES}…`,
    );
    await sleepMs(delayMs);

    try {
      await bootstrapChroma();
      console.log(`[Chroma] Initialized successfully (${Date.now() - started}ms elapsed)`);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Chroma] Connect attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);
    }
  }

  console.error(
    `[Chroma] Failed after ${MAX_RETRIES} attempts (${Date.now() - started}ms elapsed)`,
  );
  if (allowChromaDegradedStartup()) {
    setChromaMemoryUnavailable('Chroma failed to connect after retries');
    console.warn('[Chroma] Continuing in degraded mode (LAB_CHROMA_DEGRADED_OK / non-production default)');
    return;
  }
  process.exit(1);
};

// Export the server for testing purposes
export default server;

// Export the start function for external use
export const startServer = start;
