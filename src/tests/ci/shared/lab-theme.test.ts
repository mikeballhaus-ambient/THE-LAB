import { describe, expect, test, beforeEach } from '@jest/globals';
import { applyLabTheme, buildCardGradientValue } from '@/shared/theme/apply-lab-theme';
import {
  readCachedPlatformLabTheme,
  writeCachedPlatformLabTheme,
} from '@/shared/theme/lab-theme-client-cache';
import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import { getDefaultLabTheme, resolveLabTheme } from '@/shared/theme/resolve-lab-theme';
import { LabThemeSchema, parseLabTheme } from '@/shared/types/lab-theme';

describe('lab-theme', () => {
  test('resolveLabTheme merges preset with overrides', () => {
    const resolved = resolveLabTheme({
      ...getDefaultLabTheme(),
      tokens: { 'general-bg': '#000000' },
    });
    expect(resolved.tokens['general-bg']).toBe('#000000');
    expect(resolved.tokens['general-text']).toBe(CLOUD_GREY_DARK_TOKENS['general-text']);
  });

  test('buildCardGradientValue matches AppCard grid stops', () => {
    const gradient = buildCardGradientValue(CLOUD_GREY_DARK_TOKENS);
    expect(gradient).toContain('165deg');
    expect(gradient).toContain('rgb(71 85 105 / 0.65) 0%');
    expect(gradient).toContain('rgb(30 41 59 / 0.65) 100%');
  });

  test('applyLabTheme sets CSS variables on root', () => {
    const classes = new Set<string>();
    const props = new Map<string, string>();
    const root = {
      classList: {
        remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
        add: (...names: string[]) => names.forEach((n) => classes.add(n)),
        contains: (name: string) => classes.has(name),
      },
      style: {
        setProperty: (name: string, value: string) => props.set(name, value),
        getPropertyValue: (name: string) => props.get(name) ?? '',
      },
    } as unknown as HTMLElement;

    const resolved = applyLabTheme(getDefaultLabTheme(), root);
    expect(root.style.getPropertyValue('--lab-general-bg')).toBe(resolved.tokens['general-bg']);
    expect(root.style.getPropertyValue('--lab-accent-primary')).toBe(resolved.tokens['button-border-hover']);
    expect(root.style.getPropertyValue('--lab-workspace-tab-active-text')).toBe(
      resolved.tokens['button-outlined-text-hover'],
    );
    expect(root.style.getPropertyValue('--lab-workspace-tab-active-bg')).toBe(
      resolved.tokens['prime-surface-600'],
    );
    expect(root.style.getPropertyValue('--lab-text')).toBe(resolved.tokens['general-text']);
    expect(root.style.getPropertyValue('--lab-text-muted')).toBe(resolved.tokens['general-text-muted']);
    expect(root.style.getPropertyValue('--lab-surface-base')).toBe(resolved.tokens['general-bg']);
    expect(root.style.getPropertyValue('--lab-persona-tint-chat')).toBe('#60a5fa');
    expect(root.style.getPropertyValue('--lab-persona-tint-architect')).toBe('#c084fc');
    expect(root.style.getPropertyValue('--lab-card-gradient')).toContain('linear-gradient');
    expect(root.classList.contains('app-dark')).toBe(true);
  });

  test('applyLabTheme uses light workspace tab surfaces', () => {
    const classes = new Set<string>();
    const props = new Map<string, string>();
    const root = {
      classList: {
        remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
        add: (...names: string[]) => names.forEach((n) => classes.add(n)),
        contains: (name: string) => classes.has(name),
      },
      style: {
        setProperty: (name: string, value: string) => props.set(name, value),
        getPropertyValue: (name: string) => props.get(name) ?? '',
      },
    } as unknown as HTMLElement;

    const resolved = applyLabTheme(
      resolveLabTheme({ mode: 'light', presetId: 'slate-lab-light' }),
      root,
    );
    expect(root.style.getPropertyValue('--lab-workspace-tab-active-bg')).toContain('color-mix');
    expect(root.style.getPropertyValue('--lab-workspace-tab-active-text')).toBe(
      resolved.tokens['general-text'],
    );
    expect(root.style.getPropertyValue('--lab-chat-tab-active-bg')).toContain('color-mix');
    expect(root.style.getPropertyValue('--lab-chat-tab-active-text')).toBe(
      resolved.tokens['general-text'],
    );
    expect(root.style.getPropertyValue('--lab-text-accent')).toBe(resolved.tokens['button-border-hover']);
    expect(root.style.getPropertyValue('--lab-select-overlay-bg')).toBe(
      resolved.tokens['general-bg'],
    );
    expect(root.style.getPropertyValue('--lab-select-option-hover-bg')).toContain('color-mix');
    expect(root.classList.contains('app-light')).toBe(true);
  });

  test('LabThemeSchema validates preset id', () => {
    expect(() =>
      parseLabTheme({ mode: 'dark', presetId: 'not-a-preset' }),
    ).toThrow();
    const theme = parseLabTheme(getDefaultLabTheme());
    expect(LabThemeSchema.safeParse(theme).success).toBe(true);
  });

  describe('client theme cache', () => {
    beforeEach(() => {
      const store = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        value: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
          removeItem: (k: string) => store.delete(k),
          clear: () => store.clear(),
        },
        configurable: true,
      });
      localStorage.clear();
    });

    test('write and read round-trip stores full resolved tokens', () => {
      const theme = resolveLabTheme({
        mode: 'light',
        presetId: 'slate-lab-light',
      });
      writeCachedPlatformLabTheme(theme, 42);
      const cached = readCachedPlatformLabTheme(42);
      expect(cached).not.toBeNull();
      const resolved = resolveLabTheme(cached!);
      expect(resolved.mode).toBe('light');
      expect(resolved.tokens['general-bg']).toBe(SLATE_LAB_LIGHT_TOKENS['general-bg']);
    });
  });
});
