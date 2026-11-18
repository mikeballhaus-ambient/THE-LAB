# AGENTS.md - Debug Mode Rules

## Project Debugging Rules (Non-Obvious Only)

### Error Handling Conventions

- Async functions return `{ success: boolean, content: string }` format
- Delete operations return `boolean`: true if deleted/missing, false on error
- Silent failures acceptable for non-critical operations (file deletions)
- Use [`VSCodeLogger`](src/backend/utils/logger.ts) for centralized logging

### Graceful Shutdown ([`src/backend/server.ts`](src/backend/server.ts))

Both server instances must be closed on SIGTERM:
```typescript
async () => {
    server.close()
    httpServer.close()
    // Logs: "Server closed gracefully"
}
```

Missing shutdown handling can leave ChromaDB and database connections in inconsistent state.

### Database Connection Debugging ([`src/backend/db/DatabaseManager.ts`](src/backend/db/DatabaseManager.ts))

- Default path: `db/the_lab.db` (configurable via `DATABASE_PATH` env var)
- WAL (Write-Ahead Logging) journal mode enabled
- Foreign keys constraint globally ON
- Synchronous mode set to FULL for data durability
- Journal mode: WAL

Repository initialization sequence ([`DatabaseManager.connect()`](src/backend/db/DatabaseManager.ts:27) → [`DatabaseManager.initialize()`](src/backend/db/DatabaseManager.ts:45)):
1. `authRepository.bootstrap(this.db)` - User authentication and role management
2. `aiProviderRepository.bootstrap(this.db)` - AI provider configuration
3. `appsRepository.bootstrap(this.db)` - App registry and metadata
4. `personaRepository.bootstrap(this.db)` - Persona definitions and tools
5. `commandRepository.bootstrap(this.db)` - Slash command definitions
6. `toolsRepository.bootstrap(this.db)` - MCP tool metadata
7. `contextSettingsRepository.bootstrap(this.db)` - Context and configuration settings
8. `userInstructionsRepository.bootstrap(this.db)` - User instruction configurations

Each repository follows the pattern: `bootstrap(this.db)` for schema creation, then `initialize()` for data seeding and validation.

### ChromaDB Connection Debugging ([`src/backend/chroma/chroma-bootstrap.ts`](src/backend/chroma/chroma-bootstrap.ts))

Vector database for conversation memory with retry logic:

**Connection Retry Sequence:**
- First attempt: waits 2.5 seconds
- Subsequent attempts: 500ms intervals
- Total attempts: 20
- All retries exhausted → `process.exit(1)` (hard failure, no silent recovery)

**ConversationMemory:**
- Persisted via ChromaDB collections
- Stores session context and message history
- Used by AI providers for context awareness

### Port Configuration Debugging

- **Backend server**: Fixed port 3000 (never change)
- **Server apps**: Dynamic ports 4000-4999 (via `envConfig.defaultPortOffset`)
- Port-to-PID cache prevents conflicts in [`AppManager`](src/backend/AppManager.ts)

### Error Handling Checklist

| Scenario | Error Type | User Impact | Mitigation |
|----------|------------|-------------|------------|
| Database fail to connect | ConnectionError | Application crash | Hard failure after retries |
| ChromaDB timeout | TimeoutError | No conversation memory | Retry logic with exponential backoff |
| Port in use | EADDRINUSE | App launch fail | Randomize port offset |
| File permission denied | PermissionError | Operations fail | Log and continue |
| Port binding fail | BindError | Service unavailable | Fallback behavior |

### MCP Server Debugging ([`src/backend/mcp/`](src/backend/mcp/))

#### Connection Retry Logic

- **Stdio**: Single attempt with stderr event monitoring
- **HTTP**: Up to 5 attempts with 25% timeout intervals between retries

#### Tool Wrapper Pattern

External MCP server tools are wrapped in [`MCPToolInterface`](src/shared/types/mcp-tools.ts) implementations that:
- Parse the external server's `inputSchema` into Zod schemas
- Delegate execution to the transport provider
- Mark as `isExternal: true` for identification

**See:** [`MCPServerLoader.extractAndRegisterTools()`](src/backend/mcp/mcp-server-loader.ts:122)

### Testing Conventions

#### Test Structure
```typescript
describe('Calculator', () => {
  describe('add()', () => {
    test('adds two numbers', () => {
      // test implementation
    })
  })
})
```

#### MCP Tool Test Pattern
```typescript
test('execute() returns success response', async () => {
  const params: ToolParams = { fileId: 'test.txt' }
  const result = await tool.execute(params)
  expect(result.success).toBe(true)
  expect(result.content).toContain('Success')
})
```

#### Integration Test Example
```typescript
describe('File Operations Workflow', () => {
  test('creates and reads file', async () => {
    // Create file via MCP
    // Read file via MCP
    // Verify content
    // Cleanup
  })
})
```

### Debugging Tips

1. **Database Issues**: Check `db/the_lab.db` exists and is not corrupted
2. **ChromaDB Issues**: Verify ChromaDB service is running and accessible
3. **Port Conflicts**: Use `netstat -ano | findstr :3000` to check port usage
4. **MCP Server Failures**: Check stderr output for transport-specific errors
5. **File Permission Errors**: Ensure proper read/write permissions on target directories

### Environment Variables for Debugging

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_PATH` | Custom SQLite database location | `db/the_lab.db` |
| `BACKEND_URL` | Override backend URL for frontend | `http://localhost:3000` |
| `VITE_LOGGING_ENABLED` | Enable/disable file logging (0 or 1) | `1` |
| `LOG_OUTPUT_PATH` | Path for log files (when logging enabled) | N/A |

---

*This documentation serves as the primary reference for agents operating within THE-LAB. Always prioritize system safety, user confirmation for destructive actions, and code modification within designated directories only.*
