import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — teal shell with emerald accents. */
export const FOREST_EMERALD_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#134e4a',
  'general-border': '#14b8a6',

  'button-bg': '#059669',
  'button-text': '#ecfdf5',
  'button-border': '#10b981',
  'button-bg-hover': '#10b981',
  'button-border-hover': '#34d399',
  'button-outlined-text': '#6ee7b7',
  'button-outlined-border': '#34d399',
  'button-outlined-bg-hover': '#115e59',
  'button-outlined-text-hover': '#ecfdf5',

  'card-gradient-stop-1': 'rgb(4 120 87 / 0.75)',
  'card-gradient-stop-2': 'rgb(20 184 166 / 0.5)',
  'card-gradient-stop-3': 'rgb(19 78 74 / 0.65)',
  'card-border': 'rgb(52 211 153 / 0.35)',
  'card-border-hover': 'rgb(110 231 183 / 0.45)',
  'card-title-text': '#ecfdf5',
  'card-icon-bg': 'rgb(16 185 129 / 0.4)',
  'card-icon-border': 'rgb(52 211 153 / 0.4)',

  'chat-canvas-bg': '#134e4a',
  'chat-user-bg': '#047857',
  'chat-user-text': '#ecfdf5',
  'chat-assistant-bg': '#115e59',
  'chat-assistant-text': '#ccfbf1',
  'chat-log-bg': '#115e59',
  'chat-tool-result-bg': '#1e293b',
  'chat-thinking-bg': 'rgb(20 184 166 / 0.35)',
  'chat-tabs-bar-bg': '#134e4a',
  'chat-tab-active-bg': '#059669',
  'chat-tab-inactive-bg': 'rgb(20 184 166 / 0.22)',
  'chat-tab-text': '#ecfdf5',
  'chat-tab-border': '#34d399',
  'chat-composer-bg': 'rgb(17 94 89 / 0.65)',
  'chat-composer-panel-bg': '#115e59',
  'chat-input-bg': '#0f766e',
  'chat-mention-command-bg': '#059669',
  'chat-followup-bg': '#115e59',

  'prime-surface-700': '#0d9488',
  'prime-surface-800': '#115e59',
  'prime-surface-900': '#134e4a',
  'prime-surface-950': '#042f2e',
  'prime-primary-500': '#34d399',
  'prime-primary-600': '#10b981',
};
