export type ChromaMemoryHealthStatus = 'ok' | 'degraded' | 'unavailable';

export interface ChromaMemoryHealthSnapshot {
  status: ChromaMemoryHealthStatus;
  message?: string;
  updatedAt: string;
}

let snapshot: ChromaMemoryHealthSnapshot = {
  status: 'ok',
  updatedAt: new Date().toISOString(),
};

export function getChromaMemoryHealth(): ChromaMemoryHealthSnapshot {
  return snapshot;
}

export function setChromaMemoryHealthOk(): void {
  snapshot = { status: 'ok', updatedAt: new Date().toISOString() };
}

export function setChromaMemoryDegraded(message: string): void {
  snapshot = {
    status: 'degraded',
    message,
    updatedAt: new Date().toISOString(),
  };
}

export function setChromaMemoryUnavailable(message: string): void {
  snapshot = {
    status: 'unavailable',
    message,
    updatedAt: new Date().toISOString(),
  };
}

export function resetChromaMemoryHealthForTests(): void {
  snapshot = { status: 'ok', updatedAt: new Date().toISOString() };
}
