import { fileHelpers } from '../../backend/utils/file-helpers';
import { DefaultPersonaSeeding, SeedPersona, SeedToolPermission, MCPToolManifest } from '../../shared/types';
import * as mcpServers from '../../backend/mcp/mcp-servers/index';

const dataFileRelativePath = 'src/backend/db/Persona/persona-tools-config.json';
const defaultChatPersonas = ['Chat', 'Orchestrator', 'Architect', 'Code', 'Debug', 'QA']

async function loadDataFile(): Promise<DefaultPersonaSeeding | null> {
  try {
    return await fileHelpers.readJsonFile<DefaultPersonaSeeding>(dataFileRelativePath)
  } catch {
    return null
  }
}

function loadMCPManifests(): Array<SeedToolPermission> {
  const seedToolPermissions: Array<SeedToolPermission> = []

  const addManifestItem = (toolManifests: MCPToolManifest[]): SeedToolPermission[] => {
    return toolManifests.map(_ => {
      return {
        id: _.id,
        name: _.name,
        allowed: true,
      } as SeedToolPermission
    })
  }

  seedToolPermissions.push(...addManifestItem(mcpServers.appManagementToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.awaiterToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.runTerminalCommandToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.createDirectoryToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.removeDirectoryToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.context7ToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.documentorToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.createFileToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.listFilesToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.readFileToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.removeFileToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.updateFileToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.followupToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.personaManagerToolsManifest))
  // rm-64 §30.8a — every persona gets Knowledge Base access (owner directive).
  seedToolPermissions.push(...addManifestItem(mcpServers.knowledgeBaseToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.searchRepositoryToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.todoListToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.uiAutomationToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.webFetchToolsManifest))
  seedToolPermissions.push(...addManifestItem(mcpServers.webQueryToolsManifest))

  // Add tools from user_mcp_servers in database (datetime, the-lab-db, neural-memory)
  const dbMCPTools: SeedToolPermission[] = [
    // datetime server tools
    { id: 'now', name: 'datetime - now', allowed: true },
    { id: 'convert_timezone', name: 'datetime - convert_timezone', allowed: true },
    { id: 'date_math', name: 'datetime - date_math', allowed: true },
    { id: 'date_diff', name: 'datetime - date_diff', allowed: true },
    { id: 'format_date', name: 'datetime - format_date', allowed: true },
    { id: 'unix_timestamp', name: 'datetime - unix_timestamp', allowed: true },
    { id: 'business_days', name: 'datetime - business_days', allowed: true },
    { id: 'explain_cron', name: 'datetime - explain_cron', allowed: true },
    { id: 'countdown', name: 'datetime - countdown', allowed: true },
    { id: 'date_info', name: 'datetime - date_info', allowed: true },

    // the-lab-db server tools
    { id: 'read_query', name: 'the-lab-db - read_query', allowed: true },
    { id: 'write_query', name: 'the-lab-db - write_query', allowed: true },
    { id: 'create_table', name: 'the-lab-db - create_table', allowed: true },
    { id: 'list_tables', name: 'the-lab-db - list_tables', allowed: true },
    { id: 'describe_table', name: 'the-lab-db - describe_table', allowed: true },

    // nueral-memory server tools
    { id: 'nmem_recall', name: 'neural-memory - nmem_recall', allowed: true },
    { id: 'nmem_remember', name: 'neural-memory - nmem_remember', allowed: true },
    { id: 'nmem_context', name: 'neural-memory - nmem_context', allowed: true },
    { id: 'nmem_eternal', name: 'neural-memory - nmem_eternal', allowed: true },
    { id: 'nmem_todo', name: 'neural-memory - nmem_todo', allowed: true },
    { id: 'nmem_recap', name: 'neural-memory - nmem_recap', allowed: true },
    { id: 'nmem_situation', name: 'neural-memory - nmem_situation', allowed: true }
  ]

  seedToolPermissions.push(...dbMCPTools)

  return seedToolPermissions
}

function buildDefaultPersonaSeeding(existingData?: DefaultPersonaSeeding): DefaultPersonaSeeding {

  const tools: SeedToolPermission[] = loadMCPManifests()
  const configData: DefaultPersonaSeeding = {
    personas: defaultChatPersonas.map(_ => {
      return {
        persona: _,
        tools: tools
      } as SeedPersona
    })
  }

  //if existingData, then merge taking existingData as priority
  if (existingData && existingData.personas) {
    const mergedPersonas: SeedPersona[] = []

    for (const configPersona of configData.personas) {
      const existingPersona = existingData.personas.find(ep => ep.persona === configPersona.persona)

      if (existingPersona) {
        // Use existing tools as base, then add any missing tools from config
        const mergedTools = [...existingPersona.tools]
        for (const configTool of configPersona.tools) {
          if (!mergedTools.find(mt => mt.id === configTool.id)) {
            mergedTools.push(configTool)
          }
        }
        mergedPersonas.push({ ...existingPersona, tools: mergedTools })
      } else {
        // Persona doesn't exist in existing data, use config data
        mergedPersonas.push(configPersona)
      }
    }

    return { personas: mergedPersonas }
  }

  return configData
}

async function build(): Promise<void> {
  const data = await loadDataFile()
  if (data) {
    console.log(`File exists`)
  } else {
    console.log(`Building new configuration file`)
    await fileHelpers.writeJsonFile(dataFileRelativePath, buildDefaultPersonaSeeding())
  }
}

async function regen(): Promise<void> {
  const data = await loadDataFile()
  if (data) {
    console.log(`Regenerating new configuration file`)
    await fileHelpers.writeJsonFile(dataFileRelativePath, buildDefaultPersonaSeeding(data))
  } else {
    console.log(`No configuration file exists`)
    await build()
  }
}

function showOptions(): void {
  console.log(`\n****** PERSONA TOOLS SEEDING TOOL ******`);
  console.log(`Options:`);
  console.log(`  -b : Build new configuration file`);
  console.log(`  -r : Regenerate configuration file while preserving existing configuration\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 💡 FIXED LOGICAL EXCLUSION BUG: Swapped '||' to '&&' so input validations check flags accurately
  if (args.length === 0 || (args[0] !== '-b' && args[0] !== '-r')) {
    showOptions();
    process.exit(0);
  }

  const operationMode = args[0];

  if (operationMode === '-b') {
    await build()
  } else if (operationMode === '-r') {
    await regen()
  }
}

await main();
