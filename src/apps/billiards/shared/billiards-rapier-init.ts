import RAPIER from '@dimforge/rapier3d-compat';

let initPromise: Promise<void> | null = null;
let ready = false;

export async function ensureBilliardsRapier(): Promise<typeof RAPIER> {
  if (!initPromise) {
    initPromise = RAPIER.init().then(() => {
      ready = true;
    });
  }
  await initPromise;
  return RAPIER;
}

export function isBilliardsRapierReady(): boolean {
  return ready;
}

export function assertBilliardsRapierReady(): void {
  if (!ready) {
    throw new Error('Billiards Rapier WASM not initialized — call ensureBilliardsRapier() at app/server startup');
  }
}
