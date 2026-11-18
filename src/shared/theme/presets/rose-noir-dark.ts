import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — warm stone surfaces with rose accent. */
export const ROSE_NOIR_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#292524',
  'general-border': '#fb7185',

  'button-bg': '#e11d48',
  'button-text': '#fff1f2',
  'button-border': '#f43f5e',
  'button-bg-hover': '#f43f5e',
  'button-border-hover': '#fb7185',
  'button-outlined-text': '#fda4af',
  'button-outlined-border': '#fb7185',
  'button-outlined-bg-hover': '#44403c',
  'button-outlined-text-hover': '#fff1f2',

  'card-gradient-stop-1': 'rgb(159 18 57 / 0.7)',
  'card-gradient-stop-2': 'rgb(120 113 108 / 0.55)',
  'card-gradient-stop-3': 'rgb(41 37 36 / 0.75)',
  'card-border': 'rgb(251 113 133 / 0.35)',
  'card-border-hover': 'rgb(253 164 175 / 0.45)',
  'card-title-text': '#ffe4e6',
  'card-icon-bg': 'rgb(225 29 72 / 0.4)',
  'card-icon-border': 'rgb(251 113 133 / 0.4)',

  'chat-canvas-bg': '#292524',
  'chat-user-bg': '#be123c',
  'chat-user-text': '#fff1f2',
  'chat-assistant-bg': '#44403c',
  'chat-assistant-text': '#fecdd3',
  'chat-log-bg': '#44403c',
  'chat-tool-result-bg': '#1c1917',
  'chat-thinking-bg': 'rgb(120 113 108 / 0.45)',
  'chat-tabs-bar-bg': '#292524',
  'chat-tab-active-bg': '#e11d48',
  'chat-tab-inactive-bg': 'rgb(244 63 94 / 0.2)',
  'chat-tab-text': '#fff1f2',
  'chat-tab-border': '#fb7185',
  'chat-composer-bg': 'rgb(68 64 60 / 0.75)',
  'chat-composer-panel-bg': '#44403c',
  'chat-input-bg': '#57534e',
  'chat-mention-command-bg': '#e11d48',
  'chat-followup-bg': '#44403c',

  'prime-surface-700': '#be123c',
  'prime-surface-800': '#57534e',
  'prime-surface-900': '#44403c',
  'prime-surface-950': '#292524',
  'prime-primary-500': '#fb7185',
  'prime-primary-600': '#f43f5e',
};
