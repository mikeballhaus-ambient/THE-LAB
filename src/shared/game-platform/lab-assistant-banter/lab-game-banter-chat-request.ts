import type { ChatRequestPayload } from '@/shared/types/llm-provider';

/** Optional fields merged into {@link ChatRequestPayload} for a single Lab chat turn. */
export type LabChatRequestExtras = Partial<
  Pick<ChatRequestPayload, 'reasoningEffort' | 'maxTokens' | 'temperature'>
>;

/**
 * Sidecar in-game banter is one short spoken line — disable provider thinking/reasoning
 * (same contract as vs–AI structural move turns).
 */
export const LAB_GAME_BANTER_CHAT_REQUEST_EXTRAS: LabChatRequestExtras = {
  reasoningEffort: 'none',
  maxTokens: 160,
  temperature: 0.82,
};
