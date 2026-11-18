import { resolvePersonaBadgeTints } from '@/shared/theme/lab-persona-badge-tints';
import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';

describe('lab-persona-badge-tints', () => {
  test('builtin slugs use distinct hues on grey-primary presets', () => {
    const tints = resolvePersonaBadgeTints(CLOUD_GREY_DARK_TOKENS, 'dark');
    expect(tints.chat).toBe('#60a5fa');
    expect(tints.orchestrator).toBe('#818cf8');
    expect(tints.architect).toBe('#c084fc');
    expect(tints.debug).toBe('#eab308');
    expect(new Set(Object.values(tints)).size).toBe(6);
  });

  test('code and qa follow theme log tokens', () => {
    const tints = resolvePersonaBadgeTints(CLOUD_GREY_DARK_TOKENS, 'dark');
    expect(tints.code).toBe(CLOUD_GREY_DARK_TOKENS['chat-log-success']);
    expect(tints.qa).toBe(CLOUD_GREY_DARK_TOKENS['chat-log-error']);
  });
});
