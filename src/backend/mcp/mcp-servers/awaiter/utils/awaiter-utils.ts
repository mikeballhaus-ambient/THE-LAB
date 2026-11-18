import { ConversationMemory } from "@/backend/chroma/conversation-memory";
import { MCPToolResponse } from "../../../../../shared/types";
import { ProviderService } from "@/backend/ai/provider-service";
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface Awaiter {
  userId: number,
  sessionId: string,
  persona: string,
  waitForSeconds: number,
  context: string
}

export class AwaiterUtils {
  static initAwaiterEndpoint(server: FastifyInstance): void {
    server.post('/workflow/awaiter-handler', {
      schema: {
        body: {
          type: 'object',
          properties: {
            userId: { type: 'number' },
            sessionId: { type: 'string' },
            persona: { type: 'string' },
            waitForSeconds: { type: 'number' },
            context: { type: 'string' },
          },
          required: ['userId', 'sessionId', 'persona', 'waitForSeconds', 'context'],
        },
      },
    }, async (request: FastifyRequest<{ Body: Awaiter }>, reply: FastifyReply) => {

      server.log.info(`[/workflow/response-persona] Request body: ${JSON.stringify(request.body)}`);

      try {
        const {
          userId,
          sessionId,
          persona,
          waitForSeconds,
          context
        } = request.body;

        const awaiterResult = await this.awaiterHandler(userId,
          sessionId,
          persona,
          waitForSeconds,
          context)

        reply.status(200).send(awaiterResult)

      } catch (error: unknown) {

        return reply.status(500).send({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    });
  }

  static async awaiterHandler(userId: number,
    sessionId: string,
    persona: string,
    waitForSeconds: number,
    context: string): Promise<MCPToolResponse> {

    console.log(`handling awaiter for sessionId: [${sessionId}]`)

    try {

      const providerService = ProviderService.getInstance();
      const memory = ConversationMemory.getInstance();

      await memory.addTurn({
        userId,
        sessionId,
        role: 'tool',
        tool_call_id: 'awaiter',
        content: JSON.stringify({
          status: true,
          message: `The awaiter tool has successfully completed in ${waitForSeconds} seconds with \`context\`:\n\n${context}`,
          exit_code: 0
        })
      });

      const messages = await memory.retrieveAsMessages({ sessionId: sessionId, nResults: 99 });

      await providerService.generateStreamResponse(
        userId,
        sessionId,
        persona,
        messages,
        [],
        'latest',
        true
      );

      return {
        type: 'tool_result',
        tool_call_id: 'awaiter',
        function: 'execute',
        content: `Awaiter completion successfull`,
        success: true
      } as MCPToolResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        type: 'tool_result',
        tool_call_id: 'awaiter',
        function: 'execute',
        content: `Error handling awaiter completion: ${errorMessage}`,
        success: false
      } as MCPToolResponse;
    }
  }
}