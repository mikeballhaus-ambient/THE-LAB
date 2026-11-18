import { describe, test, expect } from '@jest/globals';
import {
  CommsSendEnvelopeSchema,
  validateTwEnvelopePayload,
} from '@/shared/types/schemas/lab-comms-tw-schema';

describe('lab-comms tw envelope payloads', () => {
  test('tw.invite validates', () => {
    const result = validateTwEnvelopePayload('tw.invite', {
      inviteId: '550e8400-e29b-41d4-a716-446655440000',
      gameId: 'tile-word-grid',
      gameName: 'Tile word grid',
    });
    expect(result.ok).toBe(true);
  });

  test('CommsSendEnvelopeSchema parses SEND_ENVELOPE payload', () => {
    const parsed = CommsSendEnvelopeSchema.safeParse({
      targetUserId: 2,
      type: 'tw.invite',
      payload: {
        inviteId: '550e8400-e29b-41d4-a716-446655440000',
        gameId: 'tile-word-grid',
      },
    });
    expect(parsed.success).toBe(true);
  });

  test('tw.invite rejects missing inviteId', () => {
    const result = validateTwEnvelopePayload('tw.invite', {
      gameId: 'tile-word-grid',
    });
    expect(result.ok).toBe(false);
  });
});
