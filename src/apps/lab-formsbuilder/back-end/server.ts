/**

 * Forms Builder Back-End Server Entry Point

 * Fastify server with Socket.IO for real-time updates

 */



import { createAppServer } from '@/shared/services/create-app-server';

import { AppDatabaseServiceProxy } from '../db/app-db-service';

import { FormSchemaDBReturn, FormSchemaOptions, SOCKET_EVENTS } from '../shared/types';

import { addRequestTracingMiddleware } from './middleware/request-tracing';

import { FormService } from './services/form-service';

import { ConnectorService } from './services/connector-service';

import { SubmissionService } from './services/submission-service';

import formsRoutes from './routes/forms';

import connectorRoutes from './routes/connectors';

import loadRoutes from './routes/load';

import submissionsRoutes from './routes/submissions';

import { resolveFormsBuilderUrl } from '@/shared/config/resolveFormsBuilderUrl.node';
import { registerAppSeedDataRoutes } from '@/shared/server/register-app-seed-data-routes';
import { formsBuilderSeedHandlers } from './seed-data/forms-builder-seed-handlers';



/** Forms Builder API base (this process when running as app-lab-formsbuilder). */

export const formsBuilderUrl = resolveFormsBuilderUrl();



const _port = parseInt(process.env.PORT || '3011', 10);



export let formService: FormService;

export let connectorService: ConnectorService;

export let submissionService: SubmissionService;



const start = async () => {

  const dbProxy = AppDatabaseServiceProxy.getInstance();
  await dbProxy.initialize();
  // Platform connector forms: Settings → Demo data (applyPack only), not on server boot.

  formService = new FormService();

  connectorService = new ConnectorService();

  submissionService = new SubmissionService();



  const { listen } = await createAppServer({

    attachSocketIO: true,

    registerRoutes: async (server) => {

      addRequestTracingMiddleware(server);



      server.setErrorHandler((error, request, reply) => {

        const traceContext = (request as { traceContext?: { traceId: string } }).traceContext;

        const traceId = traceContext?.traceId ?? 'unknown';

        console.error(

          `[forms-builder] ${traceId} ${request.method} ${request.url} — ${error.message}`,

        );

        if (error.stack) {

          console.error(error.stack);

        }

        const statusCode = error.statusCode ?? 500;

        reply.code(statusCode).send({

          error: error.message,

          statusCode,

          traceId,

        });

      });



      server.setNotFoundHandler((request, reply) => {

        reply.code(404).send({

          error: 'Not Found',

          message: `No route for ${request.method} ${request.url}. API lives under /api/v1 and /health.`,

          statusCode: 404,

        });

      });



      await server.register(formsRoutes, { prefix: '/api' });

      await server.register(connectorRoutes, { prefix: '/api' });

      await server.register(loadRoutes, { prefix: '/api' });

      await server.register(submissionsRoutes, { prefix: '/api' });

      registerAppSeedDataRoutes(server, formsBuilderSeedHandlers);

    },

    onSocketConnection: (io) => {

      io.on('connection', (socket) => {

        console.log(`Client connected: ${socket.id}`);



        socket.on(SOCKET_EVENTS.FORMS_LIST_REQUEST, async (options: FormSchemaOptions) => {

          try {

            const forms: FormSchemaDBReturn = await formService.getAllForms(options);

            socket.emit(SOCKET_EVENTS.FORMS_LIST_RESPONSE, forms);

          } catch (error: unknown) {

            const message = error instanceof Error ? error.message : String(error);

            socket.emit(SOCKET_EVENTS.ERROR, {

              message: `Failed to list forms: ${message}`,

            });

          }

        });



        socket.on('connector-verified', async (data: unknown) => {

          console.log('Connector verified event received:', data);

          socket.emit(SOCKET_EVENTS.CONNECTOR_VERIFIED, data);

        });



        socket.on('disconnect', () => {

          console.log(`Client disconnected: ${socket.id}`);

        });

      });

    },

  });



  await listen(_port);
};



export const startServer = start;


