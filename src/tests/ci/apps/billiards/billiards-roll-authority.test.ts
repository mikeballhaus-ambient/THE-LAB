import {
  alignRollPosesToSettleBalls,
  mergeOpponentReplayRollFrame,
  promoteAuthoritativePocketedPreview,
  stripPreviewOnlyPocketed,
  stripPreviewOnlyPocketedPoses,
} from '@/apps/billiards/shared/billiards-roll-authority';
import { TABLE_POCKET_CENTERS } from '@/apps/billiards/shared/billiards-types';

describe('billiards roll authority overlay', () => {
  test('stripPreviewOnlyPocketed keeps preview ball on table when server did not pocket', () => {
    const preview = [
      { id: 'a', number: 3, x: 900, y: 40, pocketed: true },
      { id: 'b', number: 0, x: 200, y: 300, pocketed: false },
    ];
    const auth = [
      { id: 'a', number: 3, x: 912, y: 38, pocketed: false },
      { id: 'b', number: 0, x: 200, y: 300, pocketed: false },
    ];
    const out = stripPreviewOnlyPocketed(preview, auth);
    expect(out[0]!.pocketed).toBe(false);
    expect(out[0]!.x).toBe(900);
  });

  test('alignRollPosesToSettleBalls snaps 3D poses to server coordinates', () => {
    const poses = [
      {
        id: 'a',
        number: 3,
        x: 800,
        y: 50,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
        pocketed: true,
      },
    ];
    const settle = [{ id: 'a', number: 3, x: 912, y: 38, pocketed: false }];
    const aligned = alignRollPosesToSettleBalls(poses, settle);
    expect(aligned).toHaveLength(1);
    expect(aligned[0]!.x).toBe(912);
    expect(aligned[0]!.pocketed).toBe(false);
  });

  test('promoteAuthoritativePocketedPreview sinks server pocket when preview is in throat', () => {
    const pocket = TABLE_POCKET_CENTERS[2]!;
    const preview = [
      { id: 'a', number: 11, x: pocket.x - 8, y: pocket.y + 4, pocketed: false },
    ];
    const poses = [
      {
        id: 'a',
        number: 11,
        x: pocket.x - 8,
        y: pocket.y + 4,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
      },
    ];
    const auth = [{ id: 'a', number: 11, x: pocket.x, y: pocket.y, pocketed: true }];
    const out = promoteAuthoritativePocketedPreview(preview, poses, auth);
    expect(out.balls[0]!.pocketed).toBe(true);
    expect(out.poses[0]!.pocketed).toBe(true);
  });

  test('mergeOpponentReplayRollFrame strips false pocket and keeps sim pocket in zone', () => {
    const pocket = TABLE_POCKET_CENTERS[2]!;
    const raw = {
      balls: [
        { id: 'lip', number: 3, x: 900, y: 40, pocketed: true },
        { id: 'in', number: 11, x: pocket.x - 6, y: pocket.y, pocketed: false },
      ],
      poses: [
        {
          id: 'lip',
          number: 3,
          x: 900,
          y: 40,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          rotW: 1,
          pocketed: true,
        },
        {
          id: 'in',
          number: 11,
          x: pocket.x - 6,
          y: pocket.y,
          rotX: 0,
          rotY: 0,
          rotZ: 0,
          rotW: 1,
        },
      ],
    };
    const auth = [
      { id: 'lip', number: 3, x: 912, y: 38, pocketed: false },
      { id: 'in', number: 11, x: pocket.x, y: pocket.y, pocketed: true },
    ];
    const merged = mergeOpponentReplayRollFrame(raw, auth);
    expect(merged.balls.find((b) => b.id === 'lip')!.pocketed).toBe(false);
    expect(merged.balls.find((b) => b.id === 'in')!.pocketed).toBe(true);
  });

  test('stripPreviewOnlyPocketedPoses clears pocketed flag on poses', () => {
    const poses = [
      {
        id: 'a',
        number: 3,
        x: 900,
        y: 40,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        rotW: 1,
        pocketed: true,
      },
    ];
    const auth = [{ id: 'a', number: 3, x: 912, y: 38, pocketed: false }];
    const out = stripPreviewOnlyPocketedPoses(poses, auth);
    expect(out[0]!.pocketed).toBe(false);
  });
});
