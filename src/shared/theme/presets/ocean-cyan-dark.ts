import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — deep cyan ocean base with bright cyan controls. */
export const OCEAN_CYAN_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#164e63',
  'general-border': '#06b6d4',

  'button-bg': '#0891b2',
  'button-text': '#ecfeff',
  'button-border': '#06b6d4',
  'button-bg-hover': '#06b6d4',
  'button-border-hover': '#22d3ee',
  'button-outlined-text': '#67e8f9',
  'button-outlined-border': '#22d3ee',
  'button-outlined-bg-hover': '#155e75',
  'button-outlined-text-hover': '#ecfeff',

  'card-gradient-stop-1': 'rgb(14 116 144 / 0.8)',
  'card-gradient-stop-2': 'rgb(8 145 178 / 0.55)',
  'card-gradient-stop-3': 'rgb(22 78 99 / 0.7)',
  'card-border': 'rgb(34 211 238 / 0.35)',
  'card-border-hover': 'rgb(103 232 249 / 0.45)',
  'card-title-text': '#cffafe',
  'card-icon-bg': 'rgb(8 145 178 / 0.45)',
  'card-icon-border': 'rgb(34 211 238 / 0.4)',

  'chat-canvas-bg': '#164e63',
  'chat-user-bg': '#0e7490',
  'chat-user-text': '#ecfeff',
  'chat-assistant-bg': '#155e75',
  'chat-assistant-text': '#cffafe',
  'chat-log-bg': '#155e75',
  'chat-tool-result-bg': '#0f172a',
  'chat-thinking-bg': 'rgb(8 145 178 / 0.4)',
  'chat-tabs-bar-bg': '#164e63',
  'chat-tab-active-bg': '#0891b2',
  'chat-tab-inactive-bg': 'rgb(6 182 212 / 0.25)',
  'chat-tab-text': '#ecfeff',
  'chat-tab-border': '#22d3ee',
  'chat-composer-bg': 'rgb(21 94 117 / 0.7)',
  'chat-composer-panel-bg': '#155e75',
  'chat-input-bg': '#0e7490',
  'chat-mention-command-bg': '#0891b2',
  'chat-followup-bg': '#155e75',

  'prime-surface-700': '#0891b2',
  'prime-surface-800': '#155e75',
  'prime-surface-900': '#164e63',
  'prime-surface-950': '#083344',
  'prime-primary-500': '#22d3ee',
  'prime-primary-600': '#06b6d4',
};
