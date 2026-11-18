import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — soft cream linen, stone typography. */
export const CREAM_LINEN_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#fafaf9',
  'general-text': '#292524',
  'general-text-muted': '#57534e',
  'general-border': '#e7e5e4',

  'button-bg': '#57534e',
  'button-text': '#fafaf9',
  'button-border': '#78716c',
  'button-bg-hover': '#44403c',
  'button-border-hover': '#57534e',
  'button-outlined-text': '#57534e',
  'button-outlined-border': '#a8a29e',
  'button-outlined-bg-hover': '#f5f5f4',
  'button-outlined-text-hover': '#1c1917',

  'card-gradient-stop-1': 'rgb(245 245 244 / 0.98)',
  'card-gradient-stop-2': 'rgb(231 229 228 / 0.92)',
  'card-gradient-stop-3': 'rgb(214 211 209 / 0.4)',
  'card-border': 'rgb(168 162 158 / 0.4)',
  'card-border-hover': 'rgb(120 113 108 / 0.5)',
  'card-title-text': '#44403c',
  'card-icon-bg': 'rgb(245 245 244 / 0.95)',
  'card-icon-border': 'rgb(168 162 158 / 0.45)',

  'chat-canvas-bg': '#f5f5f4',
  'chat-canvas-text': '#292524',
  'chat-user-bg': '#e7e5e4',
  'chat-user-text': '#292524',
  'chat-user-border': '#a8a29e',
  'chat-assistant-bg': '#fafaf9',
  'chat-assistant-text': '#44403c',
  'chat-assistant-border': '#d6d3d1',
  'chat-log-bg': '#fafaf9',
  'chat-tabs-bar-bg': '#f5f5f4',
  'chat-tab-active-bg': '#57534e',
  'chat-tab-inactive-bg': 'rgb(87 83 78 / 0.12)',
  'chat-tab-border': '#78716c',
  'chat-composer-bg': 'rgb(250 250 249 / 0.98)',
  'chat-composer-panel-bg': '#fafaf9',
  'chat-input-border': '#a8a29e',
  'chat-composer-label-bg': '#f5f5f4',
  'chat-mention-command-bg': '#57534e',
  'chat-followup-bg': '#fafaf9',
};
