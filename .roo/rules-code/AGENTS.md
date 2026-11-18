# AGENTS.md - Code Mode Rules

## Project Coding Rules (Non-Obvious Only)

### Non-Forms-Builder form styling (REQUIRED)

Any form/dialog built **by hand** in an app (not rendered through Forms Builder) MUST reuse the
integration-form chrome and control treatment. Reference implementation:
[`src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue`](src/apps/weather-dashboard/front-end/components/CityPickerDialog.vue).

- Dialog root classes: `lab-app-dialog lab-form-runtime` + a component-specific class.
- Define on the dialog root: `--lab-integration-chrome-bg`, `--lab-integration-body-bg`,
  `--lab-integration-field-bg`, `--lab-integration-field-border`, `--lab-form-control-bg`,
  `--lab-form-control-border` (copy from `.lab-integration-dialog` in
  [`src/assets/styles/lab-form-runtime.css`](src/assets/styles/lab-form-runtime.css)).
- Header `padding: 0.85rem 1.25rem` + chrome bg + bottom border; body recessed
  `--lab-integration-body-bg`; footer chrome bg + top border.
- **PrimeVue teleports dialogs to `<body>`** so scoped `:deep()` will NOT match. Use
  `:global(.your-dialog-class ...)`.
- PrimeVue PT ([`src/shared/theme/lab-primevue-pt.ts`](src/shared/theme/lab-primevue-pt.ts)) is
  density only — plain controls have no border/background without the tokens above.
- Use `--lab-*` tokens only; never hard-code per-app colours (breaks theme presets).

### File Path Handling ([`src/backend/utils/file-helpers.ts`](src/backend/utils/file-helpers.ts))

- Always use `fileHelpers.toForwardPath()` when passing file paths to MCP tools (converts `\` to `/`)
- Paths are relative to `process.cwd()` (project root for backend, `src` for frontend)
- `fileHelpers.deleteFile()` returns `true` if file was deleted OR didn't exist (silent success), `false` on other errors
- EXCLUDED_DIRS: `.roo`, `.git`, `.vscode`, `chroma-data`, `dist`, `logs`, `node_modules`, `docs` - file operations silently skip these

### Type Definitions ([`src/shared/types/mcp-tools.ts`](src/shared/types/mcp-tools.ts))

- Use `z.infer<typeof Schema>` for inferring Zod schema types in MCP tools
- MCPTool params MUST be Zod schemas, NOT plain objects
- Always infer types explicitly: `type Params = z.infer<typeof MyParamsSchema>`

### Error Responses ([`src/shared/types/mcp-tools.ts`](src/shared/types/mcp-tools.ts))

- All async functions should return `{ success: boolean, content: string }`
- Delete operations should return `boolean` (true if deleted, false if failed)
- Silent failures acceptable for non-critical operations like file deletions

### MCP Tool Registration ([`src/backend/server.ts`](src/backend/server.ts))

- Register tools in [`src/backend/server.ts`](src/backend/server.ts:73) during startup (creates singleton instance)
- Tool ID must be unique and snake_case
- Each tool must implement `MCPToolInterface` with id, name, description, params, execute

### MCP Server Architecture ([`src/backend/mcp/`](src/backend/mcp/))

THE-LAB has evolved from internal tools to a full MCP (Model Context Protocol) server architecture.

#### Tool Wrapper Pattern

External MCP server tools are wrapped in [`MCPToolInterface`](src/shared/types/mcp-tools.ts) implementations that:
- Parse the external server's `inputSchema` into Zod schemas
- Delegate execution to the transport provider
- Mark as `isExternal: true` for identification

**See:** [`MCPServerLoader.extractAndRegisterTools()`](src/backend/mcp/mcp-server-loader.ts:122)

#### Creating New MCP Server Modules

1. Create server class in `src/backend/mcp/mcp-servers/{category}/`:
   - Export `mcpServer` instance (McpServer from @modelcontextprotocol/sdk)
   - Export `toolsManifest` array (MCPToolManifest[])
2. Add export to `src/backend/mcp/mcp-servers/index.ts`
3. Register in `loadDefaultServers()` method

### Singleton Usage

- Use `Class.getInstance()` pattern for all shared resources
- Never create multiple instances of `MCPToolRegistry`, `AppManager`, or `ProviderService`
- `databaseManager` singleton required for all database operations

### JavaScript Test Scripts ([`scripts/run-test-by-name.js`](scripts/run-test-by-name.js), [`scripts/run-test-by-path.js`](scripts/run-test-by-path.js))

- Use `node --experimental-vm-modules` flag for all Jest test commands
- `scripts/run-test-by-name.js` requires a test name pattern as argument
- `scripts/run-test-by-path.js` accepts partial file path matches or command patterns

### MCP Server Configuration Rules

When creating or modifying MCP server configurations:

1. **Transport Selection**: Choose between `stdio` (process spawning) and `streamable-http` (HTTP-based)
2. **Command Validation**: For stdio transport, ensure `command` is provided
3. **Environment Variables**: Use `env` field to set/override environment variables as JSON object
4. **Headers**: For HTTP transport, use `headers` field for authentication and custom headers
5. **Timeout Configuration**: Set appropriate timeout values (default: 30 seconds)

### File Operations with MCP Tools

When using file-related MCP tools:

1. **CreateFileTool**: Use `filePath`, `content`, and `directory` parameters
2. **UpdateFileTool**: Provide precise SEARCH/REPLACE blocks with exact content matching
3. **ReadFileTool**: Specify the exact file path relative to project root
4. **ListFilesTool**: Use directory parameter for recursive or top-level listing

### Code Structure Guidelines

```
src/
├── App.vue                              # Root Vue component
├── backend-entry.ts                     # Application entry point
├── main.ts                              # Vue application bootstrap
├── apps/                                # Apps directory (read-only)
│   ├── {app-id}/front-end/             # Browser app components
│   └── {app-id}/back-end/              # Server app entry points
├── backend/                             # Backend server code
│   ├── ai/                              # AI provider adapters
│   ├── chroma/                          # ChromaDB integration
│   ├── db/                              # SQLite layer
│   ├── mcp/                             # MCP tool registry and servers
│   ├── middleware/                      # Auth middleware
│   ├── routes/                          # API endpoints
│   └── utils/                           # Utilities
├── dashboard/                           # Dashboard UI components
├── shared/                              # Shared between frontend/backend
└── tests/                               # Test files
```

### Type-Safety Rules

- All file paths in MCP tools MUST use `fileHelpers.toForwardPath()`
- Zod schemas for all MCP tool parameters
- Never modify files outside `src/apps/*` directory
- TypeScript strict mode enabled
- Runtime validation via Zod before execution

---

*This documentation serves as the primary reference for agents operating within THE-LAB. Always prioritize system safety, user confirmation for destructive actions, and code modification within designated directories only.*
