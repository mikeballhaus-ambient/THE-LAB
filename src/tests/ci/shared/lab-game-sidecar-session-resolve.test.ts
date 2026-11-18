import type { ChatSessionRecord } from '@/shared/types';
import {
  findReusableLabGameSidecarSession,
  formatLabGameSidecarSessionTitle,
  rawLabGameSidecarSessionTitle,
  shouldApplyAutoSessionTitleFromFirstMessage,
  truncateSessionTabTitle,
} from '@/shared/composables/lab-sidecar/lab-game-sidecar-session-resolve';

describe('lab-game-sidecar-session-resolve', () => {
  test('rawLabGameSidecarSessionTitle', () => {
    expect(rawLabGameSidecarSessionTitle('chess')).toBe('chess vs Lab Assistant');
  });

  test('formatLabGameSidecarSessionTitle matches session manager cap', () => {
    expect(formatLabGameSidecarSessionTitle('chess')).toBe(
      truncateSessionTabTitle('chess vs Lab Assistant'),
    );
  });

  test('findReusableLabGameSidecarSession prefers labGameSidecarGameId', () => {
    const sessions: ChatSessionRecord[] = [
      {
        sessionId: 'a',
        title: 'Other',
        createdAt: 1,
        lastActivity: 10,
        persona: 'Chat',
        labGameSidecarGameId: 'chess',
        files: [],
      },
      {
        sessionId: 'b',
        title: formatLabGameSidecarSessionTitle('checkers'),
        createdAt: 2,
        lastActivity: 20,
        persona: 'Chat',
        files: [],
      },
    ];
    expect(findReusableLabGameSidecarSession(sessions, 'chess')?.sessionId).toBe('a');
    expect(findReusableLabGameSidecarSession(sessions, 'checkers')?.sessionId).toBe('b');
  });

  test('findReusableLabGameSidecarSession ignores non-Chat persona', () => {
    const sessions: ChatSessionRecord[] = [
      {
        sessionId: 'x',
        title: formatLabGameSidecarSessionTitle('chess'),
        createdAt: 1,
        lastActivity: 10,
        persona: 'Code',
        files: [],
      },
    ];
    expect(findReusableLabGameSidecarSession(sessions, 'chess')).toBeUndefined();
  });

  test('findReusableLabGameSidecarSession picks most recent lastActivity', () => {
    const title = formatLabGameSidecarSessionTitle('chess');
    const sessions: ChatSessionRecord[] = [
      {
        sessionId: 'old',
        title,
        createdAt: 1,
        lastActivity: 5,
        persona: 'Chat',
        labGameSidecarGameId: 'chess',
        files: [],
      },
      {
        sessionId: 'new',
        title,
        createdAt: 2,
        lastActivity: 50,
        persona: 'Chat',
        labGameSidecarGameId: 'chess',
        files: [],
      },
    ];
    expect(findReusableLabGameSidecarSession(sessions, 'chess')?.sessionId).toBe('new');
  });

  test('shouldApplyAutoSessionTitleFromFirstMessage skips game tabs', () => {
    expect(shouldApplyAutoSessionTitleFromFirstMessage(undefined)).toBe(true);
    expect(shouldApplyAutoSessionTitleFromFirstMessage({ labGameSidecarGameId: '' })).toBe(true);
    expect(shouldApplyAutoSessionTitleFromFirstMessage({ labGameSidecarGameId: 'chess' })).toBe(false);
  });
});
