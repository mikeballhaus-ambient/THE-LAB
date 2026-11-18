import { initChroma } from './chroma-init';
import { runKbChunksStartupReconcile } from './kb-chunks-reconcile';

export async function bootstrapChroma() {
  await initChroma();
  void runKbChunksStartupReconcile({ phase: 'post-chroma' }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[kb-rag] startup reconcile (post-chroma) failed: ${message}`);
  });
}
