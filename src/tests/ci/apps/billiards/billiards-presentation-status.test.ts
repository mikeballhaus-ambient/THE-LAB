import {
  billiardsCanShootFromStatus,
  billiardsTableDisabledFromStatus,
  deriveBilliardsPresentationStatus,
  type BilliardsPresentationStatus,
} from '@/apps/billiards/front-end/stores/billiards-presentation-status';

const nonPermissiveForShoot: BilliardsPresentationStatus[] = [
  'awaitingServerAck',
  'queued',
  'aiming',
  'rolling',
  'placing',
  'presenting',
  'stalled',
];

describe('billiards-presentation-status', () => {
  test.each(nonPermissiveForShoot)('%s is not shootable', (status) => {
    expect(billiardsCanShootFromStatus(status)).toBe(false);
    expect(billiardsTableDisabledFromStatus(status)).toBe(true);
  });

  test('idle allows shoot and is not table-disabled', () => {
    expect(billiardsCanShootFromStatus('idle')).toBe(true);
    expect(billiardsTableDisabledFromStatus('idle')).toBe(false);
  });

  test('never both permissive', () => {
    const statuses: BilliardsPresentationStatus[] = [
      'idle',
      'awaitingServerAck',
      'queued',
      'aiming',
      'rolling',
      'placing',
      'presenting',
      'stalled',
    ];
    for (const status of statuses) {
      const permissiveShoot = billiardsCanShootFromStatus(status);
      const permissiveTable = !billiardsTableDisabledFromStatus(status);
      expect(permissiveShoot && permissiveTable).toBe(status === 'idle');
    }
  });

  test('awaiting ack wins over queued opponent replay', () => {
    const status = deriveBilliardsPresentationStatus({
      practiceMode: false,
      opponentShotPhase: 'queued',
      opponentPlacePhase: 'idle',
      awaitingShotAck: true,
      isRolling: false,
      pendingOpponentShotReplay: true,
      presentationExecutorBusy: false,
    });
    expect(status).toBe('awaitingServerAck');
  });
});
