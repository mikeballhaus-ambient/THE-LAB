// ============================================================================
// WebSocket Type Definitions (Consolidated)
// This file now contains all WebSocket-related types and constants
// ============================================================================

export const SOCKET_EVENTS = {
  // Form events
  FORMS_LIST_REQUEST: 'forms-list-request',
  FORMS_LIST_RESPONSE: 'forms-list-response',
  FORM_CREATED: 'form-created',
  FORM_UPDATED: 'form-updated',
  FORM_DELETED: 'form-deleted',

  // Connector events (note: singular form for consistency)
  CONNECTOR_VERIFIED: 'connector-verified',
  CONNECTOR_ERROR: 'connector-error',
  CONNECTOR_LOADED: 'connectors-loaded',
  CONNECTOR_REQUEST: 'connectors-request',

  // General events
  ERROR: 'error',
  SUCCESS: 'success',
} as const

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]

export interface WebSocketMessage {
  event: SocketEvent
  payload?: unknown
  timestamp: number
}