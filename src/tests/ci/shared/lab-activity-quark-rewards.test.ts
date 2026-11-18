import {
  LAB_ACTIVITY_QUARK_REWARDS,
  labActivityQuarkSourceRef,
} from '@/shared/types/lab-virtual-bank';

describe('lab activity quark rewards', () => {
  test('sourceRef keys are stable per activity', () => {
    expect(
      labActivityQuarkSourceRef('pollVote', { pollId: 3, userId: 9 }),
    ).toBe('activity:poll-vote:poll:3:user:9');
    expect(
      labActivityQuarkSourceRef('eventRsvp', { eventId: 2, userId: 9 }),
    ).toBe('activity:rsvp:event:2:user:9');
    expect(
      labActivityQuarkSourceRef('quizPass', { quizId: 5, userId: 9 }),
    ).toBe('activity:quiz-pass:quiz:5:user:9');
    expect(labActivityQuarkSourceRef('suggestionSubmit', { suggestionId: 7 })).toBe(
      'activity:suggestion:7',
    );
  });

  test('reward amounts are positive', () => {
    for (const amount of Object.values(LAB_ACTIVITY_QUARK_REWARDS)) {
      expect(amount).toBeGreaterThan(0);
    }
  });
});
