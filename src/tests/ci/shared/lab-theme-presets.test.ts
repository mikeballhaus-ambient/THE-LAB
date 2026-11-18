import { describe, expect, test } from '@jest/globals';
import { LAB_THEME_PRESET_IDS } from '@/shared/theme/lab-theme-token-keys';
import { contrastRatio, isAaBodyText } from '@/shared/theme/lab-theme-contrast';
import { getPresetDefinition } from '@/shared/theme/presets';
import { resolveLabTheme } from '@/shared/theme/resolve-lab-theme';
import { THEME_CONTRAST_PAIRS } from '@/shared/theme/theme-settings-groups';

const REQUIRED_CONTRAST_PAIR_IDS = new Set(['general', 'user', 'assistant', 'log', 'tool-result']);

describe('lab theme presets (rm-49 phase 4)', () => {
  test('builtin presets registered with correct modes', () => {
    expect(LAB_THEME_PRESET_IDS).toHaveLength(20);
    expect(getPresetDefinition('cloud-grey-dark').mode).toBe('dark');
    expect(getPresetDefinition('slate-indigo-dark').mode).toBe('dark');
    expect(getPresetDefinition('forest-emerald-dark').mode).toBe('dark');
    expect(getPresetDefinition('ocean-cyan-dark').mode).toBe('dark');
    expect(getPresetDefinition('rose-noir-dark').mode).toBe('dark');
    expect(getPresetDefinition('slate-lab-light').mode).toBe('light');
    expect(getPresetDefinition('paper-warm-light').mode).toBe('light');
    expect(getPresetDefinition('sky-daylight-light').mode).toBe('light');
    expect(getPresetDefinition('mint-spring-light').mode).toBe('light');
    expect(getPresetDefinition('lavender-mist-light').mode).toBe('light');
  });

  test('required chat + general contrast pairs pass AA for every preset', () => {
    const failures: string[] = [];
    for (const presetId of LAB_THEME_PRESET_IDS) {
      const preset = getPresetDefinition(presetId);
      const tokens = resolveLabTheme({ mode: preset.mode, presetId }).tokens;
      for (const pair of THEME_CONTRAST_PAIRS) {
        if (!REQUIRED_CONTRAST_PAIR_IDS.has(pair.id)) {
          continue;
        }
        const ratio = contrastRatio(tokens[pair.fg], tokens[pair.bg]);
        if (!isAaBodyText(ratio)) {
          failures.push(`${presetId}: ${pair.label} (${ratio?.toFixed(2) ?? 'n/a'})`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  test('light presets set app-light mode when resolved', () => {
    const light = resolveLabTheme({ mode: 'light', presetId: 'slate-lab-light' });
    expect(light.mode).toBe('light');
    expect(light.tokens['general-bg']).not.toBe(resolveLabTheme({ presetId: 'cloud-grey-dark', mode: 'dark' }).tokens['general-bg']);
  });
});
