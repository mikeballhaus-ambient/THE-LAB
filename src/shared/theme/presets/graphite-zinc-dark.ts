import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — neutral zinc graphite (cool grey, minimal hue). */
export const GRAPHITE_ZINC_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#18181b',
  'general-border': '#71717a',

  'button-bg': '#52525b',
  'button-text': '#fafafa',
  'button-border': '#71717a',
  'button-bg-hover': '#71717a',
  'button-border-hover': '#a1a1aa',
  'button-outlined-text': '#d4d4d8',
  'button-outlined-border': '#a1a1aa',
  'button-outlined-bg-hover': '#3f3f46',
  'button-outlined-text-hover': '#fafafa',

  'card-gradient-stop-1': 'rgb(82 82 91 / 0.55)',
  'card-gradient-stop-2': 'rgb(63 63 70 / 0.6)',
  'card-gradient-stop-3': 'rgb(24 24 27 / 0.75)',
  'card-border': 'rgb(161 161 170 / 0.34)',
  'card-border-hover': 'rgb(212 212 216 / 0.42)',
  'card-title-text': '#e4e4e7',
  'card-icon-bg': 'rgb(82 82 91 / 0.55)',
  'card-icon-border': 'rgb(161 161 170 / 0.35)',

  'chat-canvas-bg': '#18181b',
  'chat-user-bg': '#3f3f46',
  'chat-user-text': '#fafafa',
  'chat-assistant-bg': '#27272a',
  'chat-assistant-text': '#e4e4e7',
  'chat-log-bg': '#27272a',
  'chat-tool-result-bg': '#09090b',
  'chat-thinking-bg': 'rgb(63 63 70 / 0.5)',
  'chat-tabs-bar-bg': '#18181b',
  'chat-tab-active-bg': '#52525b',
  'chat-tab-inactive-bg': 'rgb(113 113 122 / 0.28)',
  'chat-tab-text': '#fafafa',
  'chat-tab-border': '#a1a1aa',
  'chat-composer-bg': 'rgb(63 63 70 / 0.75)',
  'chat-composer-panel-bg': '#27272a',
  'chat-input-bg': '#3f3f46',
  'chat-mention-command-bg': '#52525b',
  'chat-followup-bg': '#27272a',

  'prime-surface-700': '#52525b',
  'prime-surface-800': '#3f3f46',
  'prime-surface-900': '#27272a',
  'prime-surface-950': '#18181b',
  'prime-primary-500': '#a1a1aa',
  'prime-primary-600': '#71717a',
};
