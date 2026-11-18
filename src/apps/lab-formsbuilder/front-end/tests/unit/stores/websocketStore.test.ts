import { describe, test, expect, beforeEach } from '@jest/globals'
import { createPinia, setActivePinia } from 'pinia'
import { createWebSocketStore } from '@/apps/lab-formsbuilder/front-end/stores/websocketStore'
import { SOCKET_EVENTS } from '@/apps/lab-formsbuilder/shared/types/websocket-types'

describe('websocketStore', () => {
  let store: ReturnType<typeof createWebSocketStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = createWebSocketStore()
  })

  describe('state initialization', () => {
    test('initializes with isConnected as false', () => {
      expect(store.isConnected).toBe(false)
    })

    test('initializes with null socket', () => {
      expect(store.socket).toBeNull()
    })

    test('initializes with empty pendingEvents Map', () => {
      expect(store.pendingEvents.size).toBe(0)
    })

    test('initializes with null lastMessage', () => {
      expect(store.lastMessage).toBeNull()
    })

    test('initializes with empty messageHistory array', () => {
      expect(store.messageHistory).toEqual([])
    })
  })

  describe('getters', () => {
    test('eventHandlers getter returns pendingEvents Map', () => {
      const handlers = store.eventHandlers
      expect(handlers).toBeInstanceOf(Map)
    })

    test('hasPendingEvents getter returns true when events exist', () => {
      const callback1 = () => {}
      
      store.on(SOCKET_EVENTS.FORM_CREATED, callback1)
      
      expect(store.hasPendingEvents).toBe(true)
    })

    test('hasPendingEvents getter returns false when no events', () => {
      expect(store.hasPendingEvents).toBe(false)
    })
  })

  describe('actions - on', () => {
    test('adds event handler to pendingEvents', () => {
      const callback = () => {}
      
      const unsubscribe = store.on(SOCKET_EVENTS.FORM_CREATED, callback)
      
      expect(store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)).toContainEqual(callback)
      
      // Unsubscribe should work
      unsubscribe()
      
      expect(store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)).not.toContainEqual(callback)
    })

    test('returns unsubscribe function', () => {
      const callback = () => {}
      
      const unsubscribe = store.on(SOCKET_EVENTS.FORM_CREATED, callback)
      
      expect(typeof unsubscribe).toBe('function')
    })

    test('adds to existing Set for same event', () => {
      const callback1 = () => {}
      const callback2 = () => {}
      
      store.on(SOCKET_EVENTS.FORM_CREATED, callback1)
      const unsubscribe2 = store.on(SOCKET_EVENTS.FORM_CREATED, callback2)
      
      const handlers = store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)
      expect(handlers?.size).toBe(2)
      expect(handlers?.has(callback1)).toBe(true)
      expect(handlers?.has(callback2)).toBe(true)
      
      unsubscribe2()
      
      expect(store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)?.has(callback1)).toBe(true)
      expect(store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)?.has(callback2)).toBe(false)
    })
  })

  describe('actions - off', () => {
    test('removes event handler from pendingEvents', () => {
      const callback = () => {}
      
      store.on(SOCKET_EVENTS.FORM_CREATED, callback)
      
      expect(store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)).toContainEqual(callback)
      
      store.off(SOCKET_EVENTS.FORM_CREATED, callback)
      
      expect(store.pendingEvents.get(SOCKET_EVENTS.FORM_CREATED)).not.toContainEqual(callback)
    })

    test('handles non-existent event', () => {
      const callback = () => {}
      
      store.on(SOCKET_EVENTS.CONNECTOR_ERROR, callback)
      
      // Should not throw when removing handler for non-existent event
      expect(() => store.off(SOCKET_EVENTS.CONNECTOR_ERROR, callback)).not.toThrow()
    })

    test('handles non-existent callback', () => {
      const callback = () => {}
      
      store.on(SOCKET_EVENTS.FORM_UPDATED, callback)
      
      // Should not throw when removing handler that was never added
      expect(() => store.off(SOCKET_EVENTS.FORM_UPDATED, () => {})).not.toThrow()
    })
  })

  describe('actions - emit', () => {
    test('handles event with no handlers', () => {
      // Should not throw when emitting to event with no handlers
      expect(() => store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test' })).not.toThrow()
    })

    test('updates lastMessage on emit', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test' })
      
      expect(store.lastMessage).toEqual({
        event: SOCKET_EVENTS.FORM_CREATED,
        payload: { data: 'test' },
        timestamp: expect.any(Number),
      })
    })

    test('adds to messageHistory on emit', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      
      expect(store.messageHistory.length).toBe(1)
      expect(store.messageHistory[0]).toEqual({
        event: SOCKET_EVENTS.FORM_CREATED,
        payload: { data: 'test1' },
        timestamp: expect.any(Number),
      })
    })

    test('clears messageHistory with clearHistory', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      store.emit(SOCKET_EVENTS.FORM_UPDATED, { data: 'test2' })
      
      expect(store.messageHistory.length).toBe(2)
      
      store.clearHistory()
      
      expect(store.messageHistory).toEqual([])
    })

    test('returns history with subscribeToHistory', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      store.emit(SOCKET_EVENTS.FORM_UPDATED, { data: 'test2' })
      store.emit(SOCKET_EVENTS.FORM_DELETED, { data: 'test3' })
      
      const history = store.subscribeToHistory(2)
      
      expect(history.length).toBe(2)
      expect((history[0].payload as { data: string }).data).toBe('test2')
      expect((history[1].payload as { data: string }).data).toBe('test3')
    })

    test('returns all history with default limit', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      
      const history = store.subscribeToHistory()
      
      expect(history.length).toBe(1)
    })
  })

  describe('actions - clearHistory', () => {
    test('clears messageHistory array', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      store.emit(SOCKET_EVENTS.FORM_UPDATED, { data: 'test2' })
      
      expect(store.messageHistory.length).toBe(2)
      
      store.clearHistory()
      
      expect(store.messageHistory).toEqual([])
    })
  })

  describe('actions - subscribeToHistory', () => {
    test('returns last N messages with limit', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      store.emit(SOCKET_EVENTS.FORM_UPDATED, { data: 'test2' })
      store.emit(SOCKET_EVENTS.FORM_DELETED, { data: 'test3' })
      
      const history = store.subscribeToHistory(2)
      
      expect(history.length).toBe(2)
      expect((history[0].payload as { data: string }).data).toBe('test2')
      expect((history[1].payload as { data: string }).data).toBe('test3')
    })

    test('returns all messages with default limit', () => {
      store.emit(SOCKET_EVENTS.FORM_CREATED, { data: 'test1' })
      
      const history = store.subscribeToHistory()
      
      expect(history.length).toBe(1)
    })
  })
})
