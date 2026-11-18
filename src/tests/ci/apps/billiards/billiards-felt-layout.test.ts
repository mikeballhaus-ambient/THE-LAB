import {
  billiardsRollPreviewMode,
  resolveFeltBallsForRender,
} from '@/apps/billiards/shared/billiards-felt-layout';

describe('billiards felt layout', () => {
  test('preview mode only during roll or human shot ack', () => {
    expect(
      billiardsRollPreviewMode({
        hasAnimatedBalls: true,
        isRolling: true,
        awaitingHumanShotAck: false,
      }),
    ).toBe('live');
    expect(
      billiardsRollPreviewMode({
        hasAnimatedBalls: true,
        isRolling: false,
        awaitingHumanShotAck: true,
      }),
    ).toBe('live');
    expect(
      billiardsRollPreviewMode({
        hasAnimatedBalls: true,
        isRolling: false,
        awaitingHumanShotAck: false,
      }),
    ).toBe('off');
  });

  test('authoritative balls used when preview off even if preview buffer exists', () => {
    const authoritative = [
      { id: 'cue', number: 0, x: 100, y: 200, pocketed: false },
      { id: '1', number: 1, x: 500, y: 250, pocketed: false },
    ];
    const preview = [
      { id: 'cue', number: 0, x: 99, y: 199, pocketed: false },
      { id: '1', number: 1, x: 10, y: 10, pocketed: false },
    ];
    const balls = resolveFeltBallsForRender({
      authoritativeBalls: authoritative,
      previewBalls: preview,
      previewMode: 'off',
      omitCueBall: false,
    });
    expect(balls.find((b) => b.number === 1)?.x).toBe(500);
  });

  test('pre-shot hold while opponent replay pending (no post-shot flash)', () => {
    const authoritative = [
      { id: 'cue', number: 0, x: 400, y: 200, pocketed: false },
      { id: '1', number: 1, x: 600, y: 250, pocketed: false },
    ];
    const racked = [
      { id: 'cue', number: 0, x: 100, y: 200, pocketed: false },
      { id: '1', number: 1, x: 500, y: 250, pocketed: false },
    ];
    const balls = resolveFeltBallsForRender({
      authoritativeBalls: authoritative,
      previewBalls: null,
      previewMode: 'off',
      omitCueBall: false,
      opponentReplayHoldBalls: racked,
      holdOpponentReplayFelt: true,
    });
    expect(balls.find((b) => b.number === 1)?.x).toBe(500);
  });
});
