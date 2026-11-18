import { definePreset } from '@primevue/themes';
import Lara from '@primevue/themes/lara';
import type { LabTheme } from '@/shared/types/lab-theme';
import type { ResolvedLabTheme } from '@/shared/types/lab-theme';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';
import { getLabPrimeVuePtOptions } from '@/shared/theme/lab-primevue-pt';
import { ensureResolvedLabTheme } from '@/shared/theme/resolve-lab-theme';

function surfaceScale(tokens: LabThemeTokenMap) {
  return {
    0: tokens['prime-surface-0'],
    50: tokens['prime-surface-50'],
    100: tokens['prime-surface-100'],
    200: tokens['prime-surface-200'],
    300: tokens['prime-surface-300'],
    400: tokens['prime-surface-400'],
    500: tokens['prime-surface-500'],
    600: tokens['prime-surface-600'],
    700: tokens['prime-surface-700'],
    800: tokens['prime-surface-800'],
    900: tokens['prime-surface-900'],
    950: tokens['prime-surface-950'],
  };
}

export function buildLabPrimePreset(tokens: LabThemeTokenMap) {
  return definePreset(Lara, {
    semantic: {
      colorScheme: {
        dark: {
          surface: surfaceScale(tokens),
          primary: {
            500: tokens['prime-primary-500'],
            600: tokens['prime-primary-600'],
          },
          content: {
            primary: tokens['prime-content-primary'],
            secondary: tokens['prime-content-secondary'],
          },
          formField: {
            focusBorderColor: tokens['button-border'],
            hoverBorderColor: tokens['button-border'],
          },
        },
        light: {
          surface: surfaceScale(tokens),
          primary: {
            500: tokens['prime-primary-500'],
            600: tokens['prime-primary-600'],
          },
          content: {
            primary: tokens['prime-content-primary'],
            secondary: tokens['prime-content-secondary'],
          },
          formField: {
            focusBorderColor: tokens['button-border'],
            hoverBorderColor: tokens['button-border'],
          },
        },
      },
    },
  });
}

export function getLabPrimeVuePluginOptions(theme: LabTheme | ResolvedLabTheme) {
  const resolved = ensureResolvedLabTheme(theme);
  return {
    theme: {
      preset: buildLabPrimePreset(resolved.tokens),
      options: {
        darkModeSelector: '.app-dark',
      },
    },
    pt: getLabPrimeVuePtOptions(),
  };
}
