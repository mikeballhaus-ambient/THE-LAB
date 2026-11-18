import { fileHelpers } from "./file-helpers";
import {
  ChatPersona,
  FILE_PATHS,
  ICommand,
  MCPToolResponse,
  Persona,
  ProviderData,
  User
} from "../../shared/types";
import { MCPUtils } from "./mcp-utils";
import { PersonaService } from '../db/Persona/persona-service';
import { CommandService } from '../db/Command/command-service';
import { UserInstructionsService } from '../db/UserInstructions/user-instructions-service';
import { UserService } from '../db/Auth/auth-service';
import { VSCodeLogger } from './logger';
import {
  resolveActiveAppsTemplate,
  resolveAvailableMcpToolsTemplate,
  resolveAvailablePersonasTemplate,
  resolveCurrentPersonaTemplate,
  resolveRepoFilesTemplate,
  type TemplateResolverFn,
} from './template-resolvers';
import {
  REPO_FILES_SECTION,
  USER_CONTEXT_SECTION,
  buildSessionContextSection,
  formatUserInstructionsAppendix,
  type SystemPromptAssemblyOptions,
} from '../../shared/config/lab-system-prompt';

/** Process-wide cache for static markdown templates (IMPLEMENTATION-PLAN 2.1). */
const templateMarkdownCache = new Map<string, string>();

async function readTemplateMarkdownCached(relativePath: string): Promise<string> {
  const key = fileHelpers.toForwardPath(relativePath);
  const hit = templateMarkdownCache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const content = await fileHelpers.readFile(relativePath);
  templateMarkdownCache.set(key, content);
  return content;
}

export function clearTemplateMarkdownCacheForTests(): void {
  templateMarkdownCache.clear();
}

export interface TemplateDataItem {
  path: string,
  order: number,
  data: string,
  resolver: (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    mcpUtils: MCPUtils,
    assembly?: SystemPromptAssemblyOptions) => Promise<string>
}

export interface TemplateData {
  sysMsg: TemplateDataItem
  activeTodoList: TemplateDataItem
  availableMCPTools: TemplateDataItem
  availablePersonas: TemplateDataItem
  currentPersona: TemplateDataItem
  keyCommandScripts: TemplateDataItem
  repoFiles: TemplateDataItem
  sessionContext: TemplateDataItem
  userContext: TemplateDataItem
  slashCommands: TemplateDataItem
  activeApps: TemplateDataItem
  agents: TemplateDataItem
}

export class TemplateManager {
  templateData: TemplateData
  userId: number
  user!: User | null
  personas!: Persona[]
  commands!: ICommand[]

  constructor(userId: number) {
    this.templateData = this.BuildTemplatePaths()
    this.userId = userId
    this.user = UserService.getInstance().getUserById(userId)
  }

  public async init(): Promise<TemplateManager> {
    const log = await VSCodeLogger.getInstance();
    const started = performance.now();
    this.personas = PersonaService.getInstance().getAllPersonasForUser(this.userId)
    this.commands = CommandService.getInstance().getAllCommandsForUser(this.userId)
    this.templateData.sysMsg.data = await readTemplateMarkdownCached(this.templateData.sysMsg.path)
    this.templateData.activeTodoList.data = await readTemplateMarkdownCached(this.templateData.activeTodoList.path)
    this.templateData.availableMCPTools.data = await readTemplateMarkdownCached(this.templateData.availableMCPTools.path)
    this.templateData.availablePersonas.data = await readTemplateMarkdownCached(this.templateData.availablePersonas.path)
    this.templateData.currentPersona.data = await readTemplateMarkdownCached(this.templateData.currentPersona.path)
    this.templateData.keyCommandScripts.data = await readTemplateMarkdownCached(this.templateData.keyCommandScripts.path)
    this.templateData.repoFiles.data = await readTemplateMarkdownCached(this.templateData.repoFiles.path)
    this.templateData.sessionContext.data = await readTemplateMarkdownCached(this.templateData.sessionContext.path)
    this.templateData.userContext.data = await readTemplateMarkdownCached(this.templateData.userContext.path)
    this.templateData.slashCommands.data = await readTemplateMarkdownCached(this.templateData.slashCommands.path)
    this.templateData.activeApps.data = await readTemplateMarkdownCached(this.templateData.activeApps.path)
    this.templateData.agents.data = await readTemplateMarkdownCached(this.templateData.agents.path)
    log.info(`[TEMPLATE-MANAGER] init() completed in ${Math.round(performance.now() - started)}ms (userId=${this.userId})`);
    return this
  }

  buildSystemInstructions = async (
    sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    mcpUtils: MCPUtils,
    assembly?: SystemPromptAssemblyOptions,
  ): Promise<{ sysMsg: string, personaConfig: Persona | undefined }> => {
    let systemInstructions: string = ''
    const personaConfig = this.personas.filter(_ => _.name == persona)[0]
    const templateItems: TemplateDataItem[] = (Object.values(this.templateData) as TemplateDataItem[]).sort((x, y) => {
      return x.order > y.order ? 1 : x.order < y.order ? -1 : 0
    })
    for (const templateItem of templateItems) {
      if (templateItem.path === FILE_PATHS.AGENTS) {
        continue;
      }
      if (templateItem.path === FILE_PATHS.USERIDCONTEXT_TEMPLATE) {
        systemInstructions += `${USER_CONTEXT_SECTION}\n\n---\n\n`;
        continue;
      }
      if (templateItem.path === FILE_PATHS.KEYCOMMANDSCRIPTS_TEMPLATE) {
        continue;
      }
      if (templateItem.path === FILE_PATHS.REPOFILES_TEMPLATE) {
        systemInstructions += `${REPO_FILES_SECTION}\n\n---\n\n`;
        continue;
      }
      if (templateItem.resolver) {
        const resolvedInstructions = await templateItem.resolver(
          sessionId,
          persona,
          isDeveloperMode,
          providerData,
          templateItem.data,
          mcpUtils,
          assembly,
        )
        if (resolvedInstructions != '')
          systemInstructions += `${resolvedInstructions}\n\n---\n\n`
      }
    }

    return {
      sysMsg: systemInstructions,
      personaConfig: personaConfig
    }
  }

  private bindTemplateResolver(resolver: TemplateResolverFn): TemplateDataItem['resolver'] {
    return (sessionId, persona, isDeveloperMode, providerData, templateData, mcpUtils, assembly?) =>
      resolver(
        {
          userId: this.userId,
          user: this.user,
          personas: this.personas,
          commands: this.commands,
          nativeToolCalls: assembly?.nativeToolCalls ?? false,
        },
        sessionId,
        persona,
        isDeveloperMode,
        providerData,
        templateData,
        mcpUtils,
      );
  }

  resolveSysMsg = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    _mcpUtils: MCPUtils): Promise<string> => {
    void _mcpUtils;
    let sysMsg = templateData;
    const userInstructions = UserInstructionsService.getInstance().getUserInstructionsForUser(this.userId);
    sysMsg += formatUserInstructionsAppendix(userInstructions?.text);
    return sysMsg;
  }

  resolveAgents = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    _mcpUtils: MCPUtils): Promise<string> => {
    void _mcpUtils;
    return templateData
  }

  resolveSessionContext = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    _mcpUtils: MCPUtils): Promise<string> => {
    void _mcpUtils;
    void persona;
    void providerData;
    void templateData;
    return buildSessionContextSection(sessionId, isDeveloperMode);
  }

  resolveUserIdContext = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    _mcpUtils: MCPUtils): Promise<string> => {
    void _mcpUtils;

    const globalPermissionMsg: string = `
- Launch Apps: ${this.user?.permissions?.global?.canLaunchApps ? 'YES' : 'NO'}
- Teardown Apps: ${this.user?.permissions?.global?.canTeardownApps ? 'YES' : 'NO'}
- Update Apps: ${this.user?.permissions?.global?.canUpdateApps ? 'YES' : 'NO'}
- View Logs: ${this.user?.permissions?.global?.canViewLogs ? 'YES' : 'NO'}
- Manage Users: ${this.user?.permissions?.global?.canManageUsers ? 'YES' : 'NO'}
- Delete Apps: ${this.user?.permissions?.global?.canDeleteApps ? 'YES' : 'NO'}
- Manage Apps: ${this.user?.permissions?.global?.canManageApps ? 'YES' : 'NO'}
- Create Apps: ${this.user?.permissions?.global?.canCreateApps ? 'YES' : 'NO'}
`

    let appPermissionMsg: string = ''

    if (this.user?.permissions?.app && this.user.permissions.app.length > 0) {
      this.user?.permissions?.app.forEach(app => {
        appPermissionMsg += `
\`${app.appId}\`
- Can Launch: ${app.canLaunch ? 'YES' : 'NO'}
- Can Teardown: ${app.canTeardown ? 'YES' : 'NO'}
- Can Update: ${app.canUpdate ? 'YES' : 'NO'}
- Can View Logs: ${app.canViewLogs ? 'YES' : 'NO'}
`
      })
    }

    return templateData
      .replace(/{{USERID}}/, this.userId.toString())
      .replace(/{{USER_GLOBAL_PERMISSIONS}}/, globalPermissionMsg)
      .replace(/{{USER_APP_PERMISSIONS}}/, appPermissionMsg)
  }

  resolveSlashCommands = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    _mcpUtils: MCPUtils): Promise<string> => {
    void _mcpUtils;
    const personaConfig = this.personas.filter(_ => _.name == persona)[0]
    const personaCommands = this.commands.filter(_ => personaConfig.slashCommands.includes(_.key))
    if (personaCommands.length > 0) {
      let availableSlashCommands: string = templateData.replace(/{{COMMANDS_AVAILABILITY_COUNT}}/, personaCommands.length.toString())
      let commandsMsg: string = ''
      personaCommands.forEach((command, idx) => {
        commandsMsg += `command: /${command.key}\n`
        commandsMsg += `description: ${command.description}\n`
        commandsMsg += `persona: ${command.persona}\n`
        commandsMsg += `argument hints: `

        if (command.argumentHints && command.argumentHints?.length > 0) {
          commandsMsg += `${command.argumentHints.map(argHint => `<${argHint}>`).join(' ')}\n\n`
        }

        commandsMsg += `\`\`\`markdown\n${command.text}\n\`\`\`\n\n`
        commandsMsg += idx < personaCommands.length - 1 ? `---\n\n` : `---`
      })

      availableSlashCommands = availableSlashCommands.replace(/{{COMMANDS_AVAILABILITY_MAP}}/, commandsMsg)
      return availableSlashCommands
    }
    return ''
  }

  resolveAvailableTodoLists = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    mcpUtils: MCPUtils): Promise<string> => {
    try {
      const result: MCPToolResponse = await mcpUtils.fetchTodoListItems(sessionId, this.userId);

      templateData = templateData.replace(/{{ACTIVE_TODO_LISTS}}/, `
\`\`\`json
${result.content}
\`\`\`
            `);
    } catch {
      templateData = templateData.replace(/{{ACTIVE_TODO_LISTS}}/, `Failed to fetch todo lists`)
    }
    return templateData;
  }

  resolveKeyCommandScripts = async (sessionId: string,
    persona: ChatPersona,
    isDeveloperMode: boolean,
    providerData: ProviderData,
    templateData: string,
    _mcpUtils: MCPUtils): Promise<string> => {
    void _mcpUtils;
    return templateData
  }

  private BuildTemplatePaths(): TemplateData {
    return {
      sysMsg: { path: FILE_PATHS.SYSMSG_TEMPLATE, order: 0, resolver: this.resolveSysMsg },
      sessionContext: { path: FILE_PATHS.SESSIONCONTEXT_TEMPLATE, order: 1, resolver: this.resolveSessionContext },
      userContext: { path: FILE_PATHS.USERIDCONTEXT_TEMPLATE, order: 2, resolver: this.resolveUserIdContext },
      currentPersona: {
        path: FILE_PATHS.CURRENTPERSONA_TEMPLATE,
        order: 3,
        resolver: this.bindTemplateResolver(resolveCurrentPersonaTemplate),
      },
      availablePersonas: {
        path: FILE_PATHS.AVAILABLEPERSONAS_TEMPLATE,
        order: 4,
        resolver: this.bindTemplateResolver(resolveAvailablePersonasTemplate),
      },
      activeApps: {
        path: FILE_PATHS.ACTIVEAPPS_TEMPLATE,
        order: 5,
        resolver: this.bindTemplateResolver(resolveActiveAppsTemplate),
      },
      slashCommands: { path: FILE_PATHS.SLASHCOMMANDS_TEMPLATE, order: 6, resolver: this.resolveSlashCommands },
      availableMCPTools: {
        path: FILE_PATHS.AVAILABLEMCPTOOLS_TEMPLATE,
        order: 7,
        resolver: this.bindTemplateResolver(resolveAvailableMcpToolsTemplate),
      },
      activeTodoList: { path: FILE_PATHS.ACTIVETODILIST_TEMPLATE, order: 8, resolver: this.resolveAvailableTodoLists },
      repoFiles: {
        path: FILE_PATHS.REPOFILES_TEMPLATE,
        order: 9,
        resolver: this.bindTemplateResolver(resolveRepoFilesTemplate),
      },
      keyCommandScripts: { path: FILE_PATHS.KEYCOMMANDSCRIPTS_TEMPLATE, order: 10, resolver: this.resolveKeyCommandScripts },
      agents: { path: FILE_PATHS.AGENTS, order: 11, resolver: this.resolveAgents }
    } as TemplateData
  }


}