import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — olive moss tones with lime accent. */
export const MOSS_OLIVE_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#365314',
  'general-border': '#84cc16',

  'button-bg': '#65a30d',
  'button-text': '#f7fee7',
  'button-border': '#84cc16',
  'button-bg-hover': '#84cc16',
  'button-border-hover': '#a3e635',
  'button-outlined-text': '#bef264',
  'button-outlined-border': '#a3e635',
  'button-outlined-bg-hover': '#3f6212',
  'button-outlined-text-hover': '#f7fee7',

  'card-gradient-stop-1': 'rgb(54 83 20 / 0.8)',
  'card-gradient-stop-2': 'rgb(63 98 18 / 0.55)',
  'card-gradient-stop-3': 'rgb(54 83 20 / 0.7)',
  'card-border': 'rgb(163 230 53 / 0.35)',
  'card-border-hover': 'rgb(190 242 100 / 0.45)',
  'card-title-text': '#ecfccb',
  'card-icon-bg': 'rgb(101 163 13 / 0.45)',
  'card-icon-border': 'rgb(163 230 53 / 0.4)',

  'chat-canvas-bg': '#365314',
  'chat-user-bg': '#4d7c0f',
  'chat-user-text': '#f7fee7',
  'chat-assistant-bg': '#3f6212',
  'chat-assistant-text': '#d9f99d',
  'chat-log-bg': '#3f6212',
  'chat-tool-result-bg': '#1a2e05',
  'chat-thinking-bg': 'rgb(101 163 13 / 0.35)',
  'chat-tabs-bar-bg': '#365314',
  'chat-tab-active-bg': '#65a30d',
  'chat-tab-inactive-bg': 'rgb(132 204 22 / 0.2)',
  'chat-tab-text': '#f7fee7',
  'chat-tab-border': '#a3e635',
  'chat-composer-bg': 'rgb(63 98 18 / 0.65)',
  'chat-composer-panel-bg': '#3f6212',
  'chat-input-bg': '#4d7c0f',
  'chat-mention-command-bg': '#65a30d',
  'chat-followup-bg': '#3f6212',

  'prime-surface-700': '#65a30d',
  'prime-surface-800': '#4d7c0f',
  'prime-surface-900': '#3f6212',
  'prime-surface-950': '#365314',
  'prime-primary-500': '#a3e635',
  'prime-primary-600': '#84cc16',
};
