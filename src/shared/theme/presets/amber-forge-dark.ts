import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — charcoal base with amber forge accents. */
export const AMBER_FORGE_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#1c1917',
  'general-border': '#f59e0b',

  'button-bg': '#d97706',
  'button-text': '#fffbeb',
  'button-border': '#f59e0b',
  'button-bg-hover': '#f59e0b',
  'button-border-hover': '#fbbf24',
  'button-outlined-text': '#fcd34d',
  'button-outlined-border': '#fbbf24',
  'button-outlined-bg-hover': '#44403c',
  'button-outlined-text-hover': '#fffbeb',

  'card-gradient-stop-1': 'rgb(146 64 14 / 0.75)',
  'card-gradient-stop-2': 'rgb(68 64 60 / 0.55)',
  'card-gradient-stop-3': 'rgb(28 25 23 / 0.75)',
  'card-border': 'rgb(251 191 36 / 0.35)',
  'card-border-hover': 'rgb(252 211 77 / 0.45)',
  'card-title-text': '#fffbeb',
  'card-icon-bg': 'rgb(217 119 6 / 0.4)',
  'card-icon-border': 'rgb(251 191 36 / 0.4)',

  'chat-canvas-bg': '#1c1917',
  'chat-user-bg': '#b45309',
  'chat-user-text': '#fffbeb',
  'chat-assistant-bg': '#44403c',
  'chat-assistant-text': '#fde68a',
  'chat-log-bg': '#44403c',
  'chat-tool-result-bg': '#0c0a09',
  'chat-thinking-bg': 'rgb(68 64 60 / 0.5)',
  'chat-tabs-bar-bg': '#1c1917',
  'chat-tab-active-bg': '#d97706',
  'chat-tab-inactive-bg': 'rgb(245 158 11 / 0.18)',
  'chat-tab-text': '#fffbeb',
  'chat-tab-border': '#fbbf24',
  'chat-composer-bg': 'rgb(68 64 60 / 0.75)',
  'chat-composer-panel-bg': '#44403c',
  'chat-input-bg': '#57534e',
  'chat-mention-command-bg': '#d97706',
  'chat-followup-bg': '#44403c',

  'prime-surface-700': '#b45309',
  'prime-surface-800': '#57534e',
  'prime-surface-900': '#44403c',
  'prime-surface-950': '#1c1917',
  'prime-primary-500': '#fbbf24',
  'prime-primary-600': '#f59e0b',
};
