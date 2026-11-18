import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestCorrelationContext {
  correlationId: string;
  sessionId?: string;
}

const storage = new AsyncLocalStorage<RequestCorrelationContext>();

export function runWithRequestCorrelation<T>(
  context: RequestCorrelationContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

export function getRequestCorrelation(): RequestCorrelationContext | undefined {
  return storage.getStore();
}

export function newCorrelationId(): string {
  return randomUUID();
}

export function mergeSessionIntoCorrelation(sessionId: string | undefined): void {
  const store = storage.getStore();
  if (store && sessionId) {
    store.sessionId = sessionId;
  }
}
