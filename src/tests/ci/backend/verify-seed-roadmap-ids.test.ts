import { verifySeedRoadmapIds } from '@/scripts/verify-seed-roadmap-ids';

describe('verify:seed-copy (rm-67.1)', () => {
  test('no roadmap ids in user-facing seed / provisioner strings', () => {
    const errors = verifySeedRoadmapIds();
    expect(errors).toEqual([]);
  });
});
