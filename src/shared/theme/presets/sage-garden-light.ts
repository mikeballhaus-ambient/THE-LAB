import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — muted sage garden, earthy green accents. */
export const SAGE_GARDEN_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#f6f7f4',
  'general-text': '#365314',
  'general-text-muted': '#4d7c0f',
  'general-border': '#d9e2c8',

  'button-bg': '#4d7c0f',
  'button-text': '#f7fee7',
  'button-border': '#65a30d',
  'button-bg-hover': '#3f6212',
  'button-border-hover': '#4d7c0f',
  'button-outlined-text': '#4d7c0f',
  'button-outlined-border': '#84cc16',
  'button-outlined-bg-hover': '#ecfccb',
  'button-outlined-text-hover': '#365314',

  'card-gradient-stop-1': 'rgb(236 252 203 / 0.85)',
  'card-gradient-stop-2': 'rgb(220 235 200 / 0.9)',
  'card-gradient-stop-3': 'rgb(190 210 170 / 0.4)',
  'card-border': 'rgb(101 163 13 / 0.3)',
  'card-border-hover': 'rgb(77 124 15 / 0.4)',
  'card-title-text': '#3f6212',
  'card-icon-bg': 'rgb(236 252 203 / 0.8)',
  'card-icon-border': 'rgb(132 204 22 / 0.4)',

  'chat-canvas-bg': '#e8efe0',
  'chat-canvas-text': '#365314',
  'chat-user-bg': '#d9e2c8',
  'chat-user-text': '#365314',
  'chat-user-border': '#a3e635',
  'chat-assistant-bg': '#f6f7f4',
  'chat-assistant-text': '#4d7c0f',
  'chat-assistant-border': '#bef264',
  'chat-log-bg': '#f6f7f4',
  'chat-tabs-bar-bg': '#e8efe0',
  'chat-tab-active-bg': '#4d7c0f',
  'chat-tab-inactive-bg': 'rgb(77 124 15 / 0.12)',
  'chat-tab-border': '#65a30d',
  'chat-composer-bg': 'rgb(246 247 244 / 0.98)',
  'chat-composer-panel-bg': '#f6f7f4',
  'chat-input-border': '#bef264',
  'chat-composer-label-bg': '#e8efe0',
  'chat-mention-command-bg': '#4d7c0f',
  'chat-followup-bg': '#f6f7f4',
};
