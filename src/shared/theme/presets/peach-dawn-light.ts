import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — peach sunrise wash with coral actions. */
export const PEACH_DAWN_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#fff7ed',
  'general-text': '#7c2d12',
  'general-text-muted': '#9a3412',
  'general-border': '#fed7aa',

  'button-bg': '#ea580c',
  'button-text': '#fff7ed',
  'button-border': '#f97316',
  'button-bg-hover': '#c2410c',
  'button-border-hover': '#ea580c',
  'button-outlined-text': '#ea580c',
  'button-outlined-border': '#fb923c',
  'button-outlined-bg-hover': '#ffedd5',
  'button-outlined-text-hover': '#9a3412',

  'card-gradient-stop-1': 'rgb(255 237 213 / 0.95)',
  'card-gradient-stop-2': 'rgb(254 215 170 / 0.9)',
  'card-gradient-stop-3': 'rgb(253 186 116 / 0.35)',
  'card-border': 'rgb(249 115 22 / 0.35)',
  'card-border-hover': 'rgb(234 88 12 / 0.45)',
  'card-title-text': '#9a3412',
  'card-icon-bg': 'rgb(255 237 213 / 0.9)',
  'card-icon-border': 'rgb(251 146 60 / 0.45)',

  'chat-canvas-bg': '#ffedd5',
  'chat-canvas-text': '#7c2d12',
  'chat-user-bg': '#fed7aa',
  'chat-user-text': '#7c2d12',
  'chat-user-border': '#fb923c',
  'chat-assistant-bg': '#fff7ed',
  'chat-assistant-text': '#9a3412',
  'chat-assistant-border': '#fdba74',
  'chat-log-bg': '#fff7ed',
  'chat-tabs-bar-bg': '#ffedd5',
  'chat-tab-active-bg': '#ea580c',
  'chat-tab-inactive-bg': 'rgb(234 88 12 / 0.12)',
  'chat-tab-border': '#f97316',
  'chat-composer-bg': 'rgb(255 247 237 / 0.98)',
  'chat-composer-panel-bg': '#fff7ed',
  'chat-input-border': '#fdba74',
  'chat-composer-label-bg': '#ffedd5',
  'chat-mention-command-bg': '#ea580c',
  'chat-followup-bg': '#fff7ed',
};
