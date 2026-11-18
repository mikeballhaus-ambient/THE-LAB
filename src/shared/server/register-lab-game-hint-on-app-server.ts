import type { FastifyInstance } from 'fastify';
import { registerLabGameHintRoutes } from '@/shared/server/register-lab-game-hint-routes';

/** Standard Quarks hint purchase route for catalog game app servers. */
export function registerLabGameHintOnAppServer(server: FastifyInstance, hostAppId: string): void {
  registerLabGameHintRoutes(server, hostAppId);
}
