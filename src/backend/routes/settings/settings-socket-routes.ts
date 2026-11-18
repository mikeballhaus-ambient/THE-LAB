import {
  SOCKET_EVENTS,
  SocketErrorEvent,
  ProviderUpdateResultData,
  ProviderTestResultEventData,
  ProviderConfigUpdateEventData,
  ProviderFetchModelRequest,
  ProviderTestEventData,
  ProviderFetchModelResponse,
  ICommand,
  ICommandResultData,
  ICommandRequestData,
  IContextSettings,
  IContextSettingsResultData,
  FILE_PATHS,
  UpdatePersonaConfigEventData,
  UserInstructionsEventData,
} from '../../../shared/types';
import { createProviderAdapter } from '../../ai/provider-adapter-factory';
import { fileHelpers } from '../../utils/file-helpers';
import { VSCodeLogger } from '../../utils/logger';
import { personaService } from '../../db/Persona/persona-service';
import { commandService } from '../../db/Command/command-service';
import { contextSettingsService } from '../../db/ContextSettings/context-settings-service';
import { UserInstructionsService } from '../../db/UserInstructions/user-instructions-service';
import type { AppSocketRouteContext } from '../app-socket/deps';

/** Settings: sysmsg, instructions, slash commands, context, persona, providers (rm-46 **4.1**). */
export function registerSettingsSocketRoutes(ctx: AppSocketRouteContext): void {
  const { socket, providerService } = ctx;

  socket.on(SOCKET_EVENTS.GLOBAL_SYSMSG_UPDATE, async (data: { sysMsg: string }) => {
    try {
      await fileHelpers.writeFile(FILE_PATHS.SYSMSG_TEMPLATE, data.sysMsg);
      providerService.setGlobalSysMsg(data.sysMsg);
    } catch {
      (await VSCodeLogger.getInstance()).error('Error saving new globalsysmsg');
    }
  });

  socket.on(SOCKET_EVENTS.GLOBAL_USERINSTRUCTIONS_UPDATE, async (data: UserInstructionsEventData) => {
    try {
      UserInstructionsService.getInstance().updateUserInstructionsForUser(data.userId, data.text);
    } catch {
      (await VSCodeLogger.getInstance()).error('Error saving updated user instructions');
    }
  });

  socket.on(SOCKET_EVENTS.UPDATE_SLASHCOMMAND_REQUEST, async (data: {
    request: ICommandRequestData;
    userId?: number;
  }) => {
    try {
      let updatedCommands: ICommand[] = [];
      let msg = '';
      const userId = data.userId;
      if (userId) {
        if (data.request.isRemove) {
          commandService.deleteCommandForUser(userId, data.request.command.key);
          updatedCommands = commandService.getAllCommandsForUser(userId);
          msg = 'Command removed successfully';
        } else {
          const existingCommand = commandService.getCommandByKey(userId, data.request.command.key);
          if (existingCommand) {
            commandService.updateCommandForUser(userId, data.request.command.key, data.request.command);
            updatedCommands = commandService.getAllCommandsForUser(userId);
            msg = 'Command updated successfully';
          } else {
            commandService.createCommandForUser(userId, data.request.command);
            updatedCommands = commandService.getAllCommandsForUser(userId);
            msg = 'Command added successfully';
          }
        }

        await providerService.dispatchUIResponse(SOCKET_EVENTS.UPDATE_SLACHCOMMAND_RESPONSE, {
          success: true,
          message: msg,
          updatedCommands: updatedCommands,
          userId: userId,
        } as ICommandResultData);
      }
    } catch {
      await providerService.dispatchUIResponse(SOCKET_EVENTS.UPDATE_SLACHCOMMAND_RESPONSE, {
        success: false,
        message: 'Error saving Command',
      } as ICommandResultData);
    }
  });

  socket.on(SOCKET_EVENTS.UPDATE_CONTEXTSETTINGS_REQUEST, async (data: {
    userId: number;
    contextSettings: IContextSettings;
  }) => {
    try {
      if (data.contextSettings && data.userId) {
        contextSettingsService.updateContextSettingsForUser(data.userId, data.contextSettings);
        await providerService.dispatchUIResponse(SOCKET_EVENTS.UPDATE_CONTEXTSETTINGS_RESPONSE, {
          success: true,
          message: 'Context settings were saved successfully',
          updatedContextSettings: data.contextSettings,
        } as IContextSettingsResultData);
      }
    } catch {
      await providerService.dispatchUIResponse(SOCKET_EVENTS.UPDATE_CONTEXTSETTINGS_RESPONSE, {
        success: false,
        message: 'Unable to save context settings',
      } as IContextSettingsResultData);
    }
  });

  socket.on(SOCKET_EVENTS.UPDATE_PERSONA_CONFIG, async (data: UpdatePersonaConfigEventData & { userId?: number }) => {
    try {
      const userId = data.userId;
      if (userId) {
        let allPersonasForUser = personaService.getAllPersonasForUser(userId);

        const personaIndex = allPersonasForUser.findIndex((p) => p.id === data.persona.id);

        switch (data.action) {
          case 'add': {
            personaService.createPersonaForUser(userId, data.persona);
            allPersonasForUser = personaService.getAllPersonasForUser(userId);
            break;
          }
          case 'update': {
            if (personaIndex != -1) {
              const persona = {
                ...allPersonasForUser[personaIndex],
                name: data.persona.name || allPersonasForUser[personaIndex].name,
                sysMsg: {
                  role: data.persona.sysMsg?.role || allPersonasForUser[personaIndex].sysMsg.role,
                  capabilities:
                    data.persona.sysMsg?.capabilities || allPersonasForUser[personaIndex].sysMsg.capabilities,
                  output: data.persona.sysMsg?.output || allPersonasForUser[personaIndex].sysMsg.output,
                  rules: data.persona.sysMsg?.rules || allPersonasForUser[personaIndex].sysMsg.rules,
                },
                tools: data.persona.tools || allPersonasForUser[personaIndex].tools,
                reasoning: data.persona.reasoning || allPersonasForUser[personaIndex].reasoning,
                slashCommands: data.persona.slashCommands || allPersonasForUser[personaIndex].slashCommands,
              };
              if (data.persona?.id) {
                personaService.updatePersonaForUser(userId, data.persona.id, persona);
                allPersonasForUser[personaIndex] = persona;
              }
            }
            break;
          }
          case 'remove': {
            if (data.persona.id) {
              personaService.deletePersonaForUser(userId, data.persona.id);
              allPersonasForUser = personaService.getAllPersonasForUser(userId);
            }
            break;
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const logger = await VSCodeLogger.getInstance();
      logger.error(`Failed to update persona configuration for user ${data.userId}: ${message}`);
      await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
        message: 'Failed to update persona configuration',
      } as SocketErrorEvent);
    }
  });

  socket.on(SOCKET_EVENTS.PROVIDER_CONFIG_UPDATE, async (data: ProviderConfigUpdateEventData & { userId?: number }) => {
    try {
      const userId = data.userId;
      if (userId) {
        const success = await providerService.saveConfig(userId, data.providerConfig);

        if (success) {
          await providerService.dispatchUIResponse(SOCKET_EVENTS.PROVIDER_CONFIG_UPDATE_ACK, {
            success: true,
            message: 'Provider configuration saved',
            userId: userId,
          } as ProviderUpdateResultData);
        } else {
          await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
            message: 'Failed to save provider configuration',
          } as ProviderUpdateResultData);
        }
      }
    } catch (error) {
      await providerService.dispatchUIResponse(SOCKET_EVENTS.ERROR, {
        message: `Error saving config: ${error}`,
      } as ProviderUpdateResultData);
    }
  });

  socket.on(SOCKET_EVENTS.PROVIDER_TEST, async (data: ProviderTestEventData) => {
    try {
      const chatProvider = createProviderAdapter(data.providerConfig.chat);
      const embedProvider = createProviderAdapter(data.providerConfig.embed);

      const chatProviderTestConnection = chatProvider
        ? await chatProvider.testConnection()
        : ({ success: false, message: 'Unable to create chat provider' } as ProviderUpdateResultData);
      const embedProviderTestConnection = embedProvider
        ? await embedProvider.testConnection()
        : ({ success: false, message: 'Unable to create embed provider' } as ProviderUpdateResultData);

      await providerService.dispatchUIResponse(SOCKET_EVENTS.PROVIDER_TEST_RESULT, {
        chat: chatProviderTestConnection,
        embed: embedProviderTestConnection,
      } as ProviderTestResultEventData);
    } catch (error) {
      await providerService.dispatchUIResponse(SOCKET_EVENTS.PROVIDER_TEST_RESULT, {
        chat: {
          success: false,
          message: error instanceof Error ? error.message : 'Test failed',
        } as ProviderUpdateResultData,
        embed: {
          success: false,
          message: error instanceof Error ? error.message : 'Test failed',
        } as ProviderUpdateResultData,
      } as ProviderTestResultEventData);
    }
  });

  socket.on(SOCKET_EVENTS.FETCH_MODELS_REQUEST, async (data: ProviderFetchModelRequest) => {
    try {
      const chatProvider = createProviderAdapter(data.providerConfig.chat);
      const embedProvider = createProviderAdapter(data.providerConfig.embed);

      const chatProviderModels = chatProvider ? await chatProvider.fetchModels() : [];
      const embedProviderModels = embedProvider ? await embedProvider.fetchModels() : [];

      await providerService.dispatchUIResponse(SOCKET_EVENTS.FETCH_MODELS_RESPONSE, {
        chatModels: chatProviderModels,
        embedModels: embedProviderModels,
      } as ProviderFetchModelResponse);
    } catch {
      await providerService.dispatchUIResponse(SOCKET_EVENTS.FETCH_MODELS_RESPONSE, {
        chatModels: [],
        embedModels: [],
      } as ProviderFetchModelResponse);
    }
  });
}
