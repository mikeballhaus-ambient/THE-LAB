import { defineStore } from 'pinia'
import type { SOCKET_EVENTS, WebSocketMessage, SocketEvent } from '@/apps/lab-formsbuilder/shared/types/websocket-types'
import io, { type Socket } from 'socket.io-client'

type SocketPayloadHandler = (payload: unknown) => void;

export const createWebSocketStore = defineStore('websocket', {
  state: () => ({
    isConnected: false,
    socket: null as Socket | null,
    pendingEvents: new Map<string, Set<SocketPayloadHandler>>(),
    lastMessage: null as WebSocketMessage | null,
    messageHistory: [] as WebSocketMessage[],
  }),
  
  getters: {
    eventHandlers: (state) => state.pendingEvents,
    hasPendingEvents: (state) => state.pendingEvents.size > 0,
  },
  
  actions: {
    connect(serverUrl: string = '/api') {
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }

      this.socket = io(serverUrl)
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected')
        this.isConnected = true
      })
      
      this.socket.on('disconnect', (reason) => {
        console.log(`WebSocket disconnected: ${reason}`)
        this.isConnected = false
      })
      
      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error)
      })
      
      this.socket.on('message', (data: WebSocketMessage) => {
        try {
          this.emit(data.event, data.payload)
        } catch (error) {
          console.error('Failed to emit WebSocket message:', error)
        }
      })
    },
    
    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    },
    
    on(event: SocketEvent, callback: SocketPayloadHandler) {
      const handlers = this.pendingEvents.get(event) || new Set()
      handlers.add(callback)
      this.pendingEvents.set(event, handlers)
      
      return () => {
        const handlers = this.pendingEvents.get(event)
        if (handlers) {
          handlers.delete(callback)
        }
      }
    },
    
    off(event: SocketEvent, callback: SocketPayloadHandler) {
      const handlers = this.pendingEvents.get(event)
      if (handlers) {
        handlers.delete(callback)
      }
    },
    
    emit(event: SocketEvent, payload: unknown) {
      const handlers = this.pendingEvents.get(event) || new Set()
      handlers.forEach(handler => handler(payload))
      
      this.lastMessage = { event, payload, timestamp: Date.now() }
      this.messageHistory.push({ event, payload, timestamp: Date.now() })
    },
    
    // Helper to emit events using string literals (for convenience)
    emitString(event: typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS], payload: unknown) {
      const handlers = this.pendingEvents.get(event) || new Set()
      handlers.forEach(handler => handler(payload))
      
      this.lastMessage = { event, payload, timestamp: Date.now() }
      this.messageHistory.push({ event, payload, timestamp: Date.now() })
    },
    
    // Clear message history (for testing)
    clearHistory() {
      this.messageHistory = []
    },
    
    // Subscribe to last N messages (for testing)
    subscribeToHistory(limit: number = 10) {
      return limit === Infinity ? this.messageHistory : this.messageHistory.slice(-limit)
    },
  },
})
