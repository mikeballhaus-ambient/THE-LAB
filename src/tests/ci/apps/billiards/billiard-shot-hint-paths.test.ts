import {
  computeBilliardsShotHintPaths,
  findFirstContactAlongRay,
  findFirstContactObjectBall,
} from '@/apps/billiards/shared/billiard-shot-hint-paths';
import { TABLE_HEIGHT } from '@/apps/billiards/shared/billiards-types';
import { tableCushionMinX } from '@/apps/billiards/shared/table-playfield';

describe('billiard shot hint first contact', () => {
  const cue = { id: 'cue', number: 0, x: 200, y: 250, pocketed: false };

  test('wall is first contact when no object balls', () => {
    const first = findFirstContactAlongRay(
      { x: cue.x, y: cue.y },
      0,
      [cue],
    );
    expect(first?.kind).toBe('wall');
    const paths = computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, 0, [cue]);
    const seg = paths.cueStroke;
    expect(seg).not.toBeNull();
    expect(seg!.x2).toBeGreaterThan(seg!.x1);
    expect(findFirstContactObjectBall({ x: cue.x, y: cue.y }, 0, [cue])).toBeNull();
  });

  test('object ball wins over distant wall', () => {
    const balls = [
      cue,
      { id: '3', number: 3, x: 350, y: 250, pocketed: false },
    ];
    const angle = 0;
    const first = findFirstContactAlongRay({ x: cue.x, y: cue.y }, angle, balls);
    expect(first?.kind).toBe('ball');
    expect(first?.ball?.number).toBe(3);
    const paths = computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, angle, balls);
    const seg = paths.cueStroke!;
    const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    expect(len).toBeLessThan(200);
    expect(findFirstContactObjectBall({ x: cue.x, y: cue.y }, angle, balls)?.number).toBe(3);
  });

  test('wall before ball when ball is behind cue', () => {
    const balls = [
      cue,
      { id: '7', number: 7, x: 120, y: 250, pocketed: false },
    ];
    const angle = 0;
    const first = findFirstContactAlongRay({ x: cue.x, y: cue.y }, angle, balls);
    expect(first?.kind).toBe('wall');
    expect(findFirstContactObjectBall({ x: cue.x, y: cue.y }, angle, balls)).toBeNull();
  });

  test('downward shot hits bottom cushion before far balls', () => {
    const balls = [
      cue,
      { id: '5', number: 5, x: 500, y: TABLE_HEIGHT - 80, pocketed: false },
    ];
    const angle = Math.PI / 2;
    const first = findFirstContactAlongRay({ x: cue.x, y: cue.y }, angle, balls);
    expect(first?.kind).toBe('wall');
    const seg = computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, angle, balls).cueStroke!;
    expect(seg.y2).toBeGreaterThan(seg.y1);
    expect(seg.y2).toBeLessThan(TABLE_HEIGHT);
  });

  test('pocket can be first contact on sharp angle toward corner', () => {
    const cornerX = tableCushionMinX() + 8;
    const balls = [cue];
    const angle = Math.atan2(20 - cue.y, cornerX - cue.x);
    const first = findFirstContactAlongRay({ x: cue.x, y: cue.y }, angle, balls);
    expect(first?.kind === 'pocket' || first?.kind === 'wall').toBe(true);
    expect(computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, angle, balls).cueStroke).not.toBeNull();
  });

  test('object-chain hints roll direction after ball-ball contact', () => {
    const balls = [
      cue,
      { id: '3', number: 3, x: 350, y: 250, pocketed: false },
    ];
    const angle = 0;
    const paths = computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, angle, balls);
    expect(paths.objectChain).toHaveLength(1);
    const obj = paths.objectChain[0]!;
    expect(obj.x2 - obj.x1).toBeGreaterThan(10);
    expect(Math.abs(obj.y2 - obj.y1)).toBeLessThan(5);
  });

  test('object-chain is empty when first contact is not a ball', () => {
    const paths = computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, 0, [cue]);
    expect(paths.objectChain).toHaveLength(0);
  });

  test('object-ball hint segment is collinear with aim direction on a cut', () => {
    const balls = [
      cue,
      { id: '6', number: 6, x: 380, y: 218, pocketed: false },
    ];
    const angle = Math.atan2(235 - cue.y, 360 - cue.x);
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const seg = computeBilliardsShotHintPaths({ x: cue.x, y: cue.y }, angle, balls).cueStroke!;
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const cross = dx * dir.y - dy * dir.x;
    expect(Math.abs(cross)).toBeLessThan(0.02);
  });
});
