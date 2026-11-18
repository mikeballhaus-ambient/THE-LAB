import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — blush rose petals, soft pink surfaces. */
export const BLUSH_PETAL_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#fff1f2',
  'general-text': '#9f1239',
  'general-text-muted': '#be123c',
  'general-border': '#fecdd3',

  'button-bg': '#e11d48',
  'button-text': '#fff1f2',
  'button-border': '#f43f5e',
  'button-bg-hover': '#be123c',
  'button-border-hover': '#e11d48',
  'button-outlined-text': '#e11d48',
  'button-outlined-border': '#fb7185',
  'button-outlined-bg-hover': '#ffe4e6',
  'button-outlined-text-hover': '#9f1239',

  'card-gradient-stop-1': 'rgb(255 228 230 / 0.95)',
  'card-gradient-stop-2': 'rgb(254 205 211 / 0.9)',
  'card-gradient-stop-3': 'rgb(251 113 133 / 0.25)',
  'card-border': 'rgb(244 63 94 / 0.3)',
  'card-border-hover': 'rgb(225 29 72 / 0.4)',
  'card-title-text': '#be123c',
  'card-icon-bg': 'rgb(255 228 230 / 0.9)',
  'card-icon-border': 'rgb(251 113 133 / 0.45)',

  'chat-canvas-bg': '#ffe4e6',
  'chat-canvas-text': '#9f1239',
  'chat-user-bg': '#fecdd3',
  'chat-user-text': '#9f1239',
  'chat-user-border': '#fb7185',
  'chat-assistant-bg': '#fff1f2',
  'chat-assistant-text': '#be123c',
  'chat-assistant-border': '#fda4af',
  'chat-log-bg': '#fff1f2',
  'chat-tabs-bar-bg': '#ffe4e6',
  'chat-tab-active-bg': '#e11d48',
  'chat-tab-inactive-bg': 'rgb(225 29 72 / 0.12)',
  'chat-tab-border': '#f43f5e',
  'chat-composer-bg': 'rgb(255 241 242 / 0.98)',
  'chat-composer-panel-bg': '#fff1f2',
  'chat-input-border': '#fda4af',
  'chat-composer-label-bg': '#ffe4e6',
  'chat-mention-command-bg': '#e11d48',
  'chat-followup-bg': '#fff1f2',
};
