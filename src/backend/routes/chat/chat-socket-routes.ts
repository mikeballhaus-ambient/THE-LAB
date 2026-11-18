import {
  FirstMessageReceivedEventData,
  ServerErrorMessage,
  SocketErrorEvent,
  SOCKET_EVENTS,
  SystemInstructionsRequestData,
  SystemInstructionsResponseData,
  SendChatMesssageData,
  PersonaSwitchedEventData,
  ChatPersona,
} from '../../../shared/types';
import { CommandService } from '../../db/Command/command-service';
import { Parser } from '../../utils/parse-utils';
import { VSCodeLogger } from '../../utils/logger';
import { chatUtils } from '../../utils/chat/utils';
import { syncTodoLists } from '../../mcp/mcp-servers/todo-list/todo-list-mcp-server';
import { effectiveDeveloperMode } from '../../../shared/config/lab-production-profile';
import { resolveSessionMessageLimit } from '../../../shared/config/lab-chroma-limits';
import { resolveEffectiveStreaming } from '../../../shared/config/lab-provider-stream';
import { resolveSystemPromptAssembly } from '../../../shared/config/lab-system-prompt';
import { mergeSessionIntoCorrelation } from '../../utils/request-correlation';
import type { AppSocketRouteContext } from '../app-socket/deps';
import { rememberAppBuilderCatalogTagsFromSidecarContext } from '../../db/AppTags/app-builder-catalog-tag-stash';
import { buildLabGameBanterTurnUserContent } from '@/shared/game-platform/lab-assistant-banter/build-banter-llm-prompt';
import { LAB_GAME_BANTER_CHAT_REQUEST_EXTRAS } from '@/shared/game-platform/lab-assistant-banter/lab-game-banter-chat-request';
import {
  enrichChatMessagesWithLabGameSnapshot,
  labSidecarGameSnapshotMatchesContext,
} from '@/shared/composables/lab-sidecar/build-lab-game-user-chat-context';
import { appendLabGameMatchSnapshotToPrompt } from '@/shared/game-platform/lab-assistant-banter/format-lab-game-match-state-for-prompt';
import { enrichLabSidecarGameMatchSnapshotWithUser } from '@/shared/composables/lab-sidecar/lab-sidecar-game-match-snapshot';
import { setLabSidecarSessionToolAllowlist } from '../../utils/lab-sidecar-tool-profile-session';

/** Chat message, stop, summarize, todo sync, system-instructions preview (rm-46 **4.1**). */
export function registerChatSocketRoutes(ctx: AppSocketRouteContext): void {
  const { socket, providerService, memory } = ctx;

  socket.on(SOCKET_EVENTS.MESSAGE, async (data: SendChatMesssageData) => {
    try {
      if (!data || typeof data !== 'object' || !data.userId) {
        return;
      }

      const isGameBanter = Boolean(data.labGameBanter);
      let enrichedText: string;
      let providedPersona: ChatPersona = data.persona;

      if (isGameBanter && data.labGameBanter) {
        enrichedText = buildLabGameBanterTurnUserContent(data.labGameBanter);
        if (
          data.labGameMatchSnapshot &&
          labSidecarGameSnapshotMatchesContext(data.labGameMatchSnapshot, data.labSidecarContext)
        ) {
          const snapshotWithName = enrichLabSidecarGameMatchSnapshotWithUser(
            data.labGameMatchSnapshot,
            data.labGameBanter.humanDisplayName,
          );
          enrichedText = appendLabGameMatchSnapshotToPrompt(enrichedText, snapshotWithName);
        }
      } else {
        const { message: contextFilesMessage } = await Parser.parseContextFiles(data.text);

        const userCommands = CommandService.getInstance().getAllCommandsForUser(data.userId);

        const { message: contextCommandsMessage, persona: updatedPersona } =
          await Parser.parseSlashCommands(contextFilesMessage, userCommands);

        enrichedText = contextCommandsMessage;

        if (updatedPersona && updatedPersona != undefined) {
          providedPersona = updatedPersona;
          await providerService.dispatchUIResponse(SOCKET_EVENTS.PERSONA_SWITCHED, {
            sessionId: data.sessionId,
            persona: updatedPersona,
          } as PersonaSwitchedEventData);
        }
      }

      const providedSessionId = data.sessionId;
      mergeSessionIntoCorrelation(providedSessionId);
      const providedUserId = data.userId;

      if (typeof enrichedText !== 'string' || (!isGameBanter && !enrichedText.trim())) {
        return;
      }

      if (typeof providedSessionId !== 'string' || !providedSessionId) {
        return;
      }

      rememberAppBuilderCatalogTagsFromSidecarContext(providedUserId, data.labSidecarContext);

      let messages;

      if (isGameBanter) {
        setLabSidecarSessionToolAllowlist(providedSessionId, []);
        messages = await memory.retrieveAsMessages({
          sessionId: providedSessionId,
          nResults: resolveSessionMessageLimit(),
        });
        messages.push({
          role: 'user',
          content: enrichedText,
        });
      } else {
        await memory.addTurn({
          userId: providedUserId,
          sessionId: providedSessionId,
          role: 'user',
          content: enrichedText,
        });

        messages = await memory.retrieveAsMessages({
          sessionId: providedSessionId,
          nResults: resolveSessionMessageLimit(),
        });

        if (messages.length === 1) {
          const firstText = messages[0].content;
          const words = (firstText as string).trim().split(/\s+/);
          const titleWords = words.slice(0, 4);
          let title = titleWords.join(' ');

          if (title.length > 25) {
            title = title.substring(0, 22) + '..';
          }

          await providerService.dispatchUIResponse(SOCKET_EVENTS.FIRST_MESSAGE_RECEIVED, {
            sessionId: providedSessionId,
            title,
          } as FirstMessageReceivedEventData);
        }

        if (messages.length == 0 || messages[messages.length - 1].role != 'user') {
          messages.push({
            role: 'user',
            content: enrichedText,
          });
        }

        if (
          data.labGameMatchSnapshot &&
          labSidecarGameSnapshotMatchesContext(data.labGameMatchSnapshot, data.labSidecarContext)
        ) {
          messages = enrichChatMessagesWithLabGameSnapshot(messages, enrichedText, data.labGameMatchSnapshot);
        }
      }

      const adapters = await providerService.ResolveProviderAdapter(providedUserId);
      const useStreaming = resolveEffectiveStreaming(Boolean(data.streaming), adapters?.chatProvider);

      const chatRequestExtras = isGameBanter ? LAB_GAME_BANTER_CHAT_REQUEST_EXTRAS : undefined;

      if (useStreaming) {
        await providerService.generateStreamResponse(
          providedUserId,
          providedSessionId,
          providedPersona,
          messages,
          data.files,
          data.chatId,
          effectiveDeveloperMode(data.isDeveloperMode),
          data.labSidecarContext,
          chatRequestExtras,
          data.labUserDisplayName,
        );
      } else {
        await providerService.generateResponse(
          providedUserId,
          providedSessionId,
          providedPersona,
          messages,
          data.files,
          data.chatId,
          effectiveDeveloperMode(data.isDeveloperMode),
          data.labSidecarContext,
          chatRequestExtras,
          data.labUserDisplayName,
        );
      }
    } catch (error) {
      let errorMessage = `Oops! ${providerService.getGeneralErrorMsg()}`;

      if (error instanceof Error && 'message' in error) {
        errorMessage = `Oops! ${providerService.getGeneralErrorMsg()}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = `Oops! ${providerService.getGeneralErrorMsg()}`;
      }

      await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, { message: errorMessage } as SocketErrorEvent);
    }
  });

  socket.on(SOCKET_EVENTS.STOP_REQUEST, async () => {
    try {
      chatUtils.requestStop();
    } catch {
      /* ignore */
    }
  });

  socket.on(SOCKET_EVENTS.SUMMARIZE_REQUEST, async (data?: { sessionId?: string; userId?: number }) => {
    const sessionId = data?.sessionId;
    const userId = data?.userId;
    if (!sessionId || userId == null) {
      return;
    }
    try {
      const messages = await memory.retrieveAsMessages({
        sessionId,
        nResults: resolveSessionMessageLimit(),
      });
      await providerService.summarizeRequest(userId, sessionId, messages);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
        sender: 'assistant',
        message: `Failed to summarize: ${errorMessage}`,
      } as ServerErrorMessage);
    }
  });

  socket.on(SOCKET_EVENTS.TODO_LIST_SYNC, async (data) => {
    try {
      const sessionId = data.sessionId;
      const todoLists = data.todoLists;

      if (!sessionId || !Array.isArray(todoLists)) {
        return;
      }

      syncTodoLists(sessionId, todoLists);
    } catch (error) {
      (await VSCodeLogger.getInstance()).error(`[CHAT]: Error processing todo-list-sync: ${error}`);
    }
  });

  socket.on(SOCKET_EVENTS.CURRENT_SYSTEM_INSTRUCTIONS_REQUEST, async (data: SystemInstructionsRequestData) => {
    const templateManager = await providerService.getTemplateManager(data.userId);
    const providers = await providerService.ResolveProviderAdapter(data.userId);
    const assembly = resolveSystemPromptAssembly(providers?.chatProvider);
    const { sysMsg } = await providerService.getTemplateManagerData(
      templateManager,
      data.sessionId,
      data.persona,
      effectiveDeveloperMode(data.isDeveloperMode),
      assembly,
    );
    await providerService.dispatchUIResponse(SOCKET_EVENTS.CURRENT_SYSTEM_INSTRUCTIONS_REQUEST_COMPLETED, {
      systemInstructions: sysMsg,
    } as SystemInstructionsResponseData);
  });
}
