import type { FastifyInstance } from 'fastify';

import { buildConnectorDiscoveryIndex } from '@/shared/server/connector-discovery';
import { buildTicketDiscoveryContract } from '../../utils/connector/ticket-discovery-builder';
import { buildKanbanBoardDiscoveryContract } from '../../utils/connector/kanban-board-discovery-builder';



const discoveryRoutes = async (fastifyInstance: FastifyInstance) => {

  const baseUrl = process.env.BASEURL ?? 'http://localhost';

  const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3012;



  fastifyInstance.get('/', async () =>
    buildConnectorDiscoveryIndex('help-desk', [
      { entityKey: 'ticket', name: 'Ticket', discoveryPath: 'ticket' },
      { entityKey: 'kanban-board', name: 'KanbanBoard', discoveryPath: 'kanban-board' },
    ]),
  );



  fastifyInstance.get('/ticket', async () => buildTicketDiscoveryContract(baseUrl, port));

  fastifyInstance.get('/kanban-board', async () => buildKanbanBoardDiscoveryContract(baseUrl, port));

};



export default discoveryRoutes;


