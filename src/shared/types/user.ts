import { LLMProviderConfig } from "./ai-providers";
import { UserPermissions } from "./auth";
import { ICommand } from "./command";
import { IContextSettings } from "./context-settings";
import { IMCPServerConfig } from "./mcp-servers";
import type { McpStdioAccessPayload } from "./mcp-stdio-access";
import { ToolsList } from "./mcp-tools";
import { Persona } from "./persona";
import { UserInstruction } from "./user-instructions";

/**
 * User roles with permission hierarchy
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * User account status
 */
export type UserStatus = 'active' | 'inactive';

/**
 * User object structure
 * - userId: SQLite auto-increment integer ID
 * - username: Unique username (required)
 * - email: Optional email address
 * - role: User role (owner | admin | member | viewer)
 * - status: active or inactive
 * - lastSeen: ISO timestamp of last activity
 * - createdAt: ISO timestamp
 * - permissions: Role-based permissions
 * - passwordHash: SHA-256 hashed password (NULL for anonymous users)
 * - canCreateSessions: Permission to create chat sessions (true for all roles)
 */
export interface User {
  id?: number;                    // Alias for userId - used for backward compatibility
  userId: number;
  name?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  lastSeen: string;
  createdAt: string;
  permissions?: UserPermissions
  passwordHash?: string;
  avatar?: string;
  /** When true, user must change password before full platform access (rm-46 1.11) */
  mustChangePassword?: boolean;
  /** Enables developer sysMsg / tooling visibility (set by owner/admin in User Management) */
  isDeveloperMode?: boolean;
}

/**
 * User partial for updates (profile editing)
 */
export interface UserPartialUpdate {
  email?: string;
  passwordHash?: string;
  status?: UserStatus;
  role?: UserRole;
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  username: string;
  email?: string;
  password: string;
}

/**
 * User login data
 */
export interface UserLoginData {
  username: string;
  password: string;
}

// User authentication request (client -> server)
export interface UserLoginEventData {
  username?: string;
  password?: string;
  isAutoLogin?: boolean;
  userId?: number;
}

export interface UserRegisterEventData {
  username: string;
  password: string;
  email: string;
  role: string
}

// Authentication response (server -> client)
export interface UserAuthenticatedEventData {
  userId?: number;
  name?: string;
  role?: UserRole;
  user?: User;
  isAuthenticated?: boolean;
  /** Short-lived JWT for platform/app HTTP APIs (rm-46 D-01) */
  accessToken?: string;
  /** Server session id — send on Socket.IO handshake as labSessionId */
  labSessionId?: string;
  /** When true, client must call `/auth/change-password` before other platform actions */
  mustChangePassword?: boolean;
  message?: string;
}

export interface UserLoadEventData {
  personas?: Persona[];
  llmProviderConfig?: LLMProviderConfig;
  commands?: ICommand[];
  contextSettings?: IContextSettings;
  userInstructions?: UserInstruction;
}

export interface UserLoadMCPEventData {
  mcpServers?: IMCPServerConfig[];
  tools?: ToolsList[];
  stdioAccess?: McpStdioAccessPayload;
}

// User list response (server -> client)
export interface UserListEventData {
  users: User[];
  currentUser?: User;
}

// Auth state check response
export interface AuthStateEventData {
  isAuthenticated: boolean;
  user?: User;
  message?: string;
}
