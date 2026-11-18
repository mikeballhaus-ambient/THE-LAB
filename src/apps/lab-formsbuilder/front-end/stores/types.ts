/*
import { useFormStore } from './formStore'
import { useConnectorsStore } from './connectorsStore'
import { createWebSocketStore } from './websocketStore'

export interface FormsStoreState {
  forms: any[]
  selectedFormId: string | null
  currentForm: any | null
  pendingFormCreate: any | null
  isLoading: boolean
  error: Error | null
}

export interface ConnectorsStoreState {
  connectors: any[]
  selectedConnectorId: string | null
  isLoading: boolean
  error: Error | null
}

export interface WebSocketStoreState {
  isConnected: boolean
  socket: any | null
  pendingEvents: Map<string, Set<Function>>
  lastMessage: any | null
  messageHistory: any[]
}

export interface StoreComposition {
  formsStore: ReturnType<typeof useFormStore>
  connectorsStore: ReturnType<typeof useConnectorsStore>
  websocketStore: ReturnType<typeof createWebSocketStore>
}
  */
