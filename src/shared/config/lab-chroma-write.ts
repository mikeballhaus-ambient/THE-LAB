/** rm-46 Phase 2.4 — optional async Chroma persistence for non-user turns. */

export function isChromaAsyncWriteEnabled(): boolean {
  if (process.env.LAB_CHROMA_ASYNC_WRITE === '0') {
    return false;
  }
  if (process.env.LAB_CHROMA_ASYNC_WRITE === '1') {
    return true;
  }
  // Default: async assistant/tool writes; user turns stay synchronous for retrieve ordering
  return true;
}

/** When true, backend may start if Chroma bootstrap fails (D-08 degraded). */
export function allowChromaDegradedStartup(): boolean {
  if (process.env.LAB_CHROMA_DEGRADED_OK === '1') {
    return true;
  }
  if (process.env.LAB_CHROMA_DEGRADED_OK === '0') {
    return false;
  }
  return process.env.LAB_PRODUCTION_PROFILE !== '1';
}
