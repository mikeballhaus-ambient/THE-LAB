import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Alternate dark — indigo primary, cooler card gradient, distinct chat chrome for preset-switch tests. */
export const SLATE_INDIGO_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  /* Base lifted from indigo-950 → indigo-900 so shell/chat read less crushed */
  'general-bg': '#312e81',
  'general-border': '#4f46e5',

  'button-bg': '#4f46e5',
  'button-text': '#eef2ff',
  'button-border': '#6366f1',
  'button-bg-hover': '#6366f1',
  'button-border-hover': '#818cf8',
  'button-outlined-text': '#c7d2fe',
  'button-outlined-border': '#818cf8',
  'button-outlined-bg-hover': '#4338ca',
  'button-outlined-text-hover': '#eef2ff',

  'card-gradient-stop-1': 'rgb(79 70 229 / 0.5)',
  'card-gradient-stop-2': 'rgb(67 56 202 / 0.55)',
  'card-gradient-stop-3': 'rgb(49 46 129 / 0.65)',
  'card-border': 'rgb(129 140 248 / 0.4)',
  'card-border-hover': 'rgb(165 180 252 / 0.5)',
  'card-title-text': '#e0e7ff',
  'card-icon-bg': 'rgb(79 70 229 / 0.45)',
  'card-icon-border': 'rgb(129 140 248 / 0.45)',

  'chat-canvas-bg': '#312e81',
  'chat-user-bg': '#4f46e5',
  'chat-user-text': '#eef2ff',
  'chat-assistant-bg': '#4338ca',
  'chat-assistant-text': '#e0e7ff',
  'chat-log-bg': '#3730a3',
  'chat-tool-result-bg': '#1e293b',
  'chat-thinking-bg': 'rgb(79 70 229 / 0.4)',
  'chat-tabs-bar-bg': '#312e81',
  'chat-tab-active-bg': '#4f46e5',
  'chat-tab-inactive-bg': 'rgb(79 70 229 / 0.28)',
  'chat-tab-text': '#eef2ff',
  'chat-tab-border': '#818cf8',
  'chat-composer-bg': 'rgb(67 56 202 / 0.6)',
  'chat-composer-panel-bg': '#3730a3',
  'chat-input-bg': '#4338ca',
  'chat-mention-command-bg': '#4f46e5',
  'chat-followup-bg': '#3730a3',

  'prime-surface-700': '#4f46e5',
  'prime-surface-800': '#4338ca',
  'prime-surface-900': '#3730a3',
  'prime-surface-950': '#312e81',
  'prime-primary-500': '#a5b4fc',
  'prime-primary-600': '#818cf8',
};
