import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — soft violet mist with purple accents. */
export const LAVENDER_MIST_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#faf5ff',
  'general-text': '#4c1d95',
  'general-text-muted': '#6d28d9',
  'general-border': '#ddd6fe',

  'button-bg': '#7c3aed',
  'button-text': '#faf5ff',
  'button-border': '#8b5cf6',
  'button-bg-hover': '#6d28d9',
  'button-border-hover': '#7c3aed',
  'button-outlined-text': '#7c3aed',
  'button-outlined-border': '#a78bfa',
  'button-outlined-bg-hover': '#ede9fe',
  'button-outlined-text-hover': '#5b21b6',

  'card-gradient-stop-1': 'rgb(237 233 254 / 0.95)',
  'card-gradient-stop-2': 'rgb(221 214 254 / 0.9)',
  'card-gradient-stop-3': 'rgb(196 181 253 / 0.35)',
  'card-border': 'rgb(139 92 246 / 0.35)',
  'card-border-hover': 'rgb(124 58 237 / 0.45)',
  'card-title-text': '#5b21b6',
  'card-icon-bg': 'rgb(237 233 254 / 0.9)',
  'card-icon-border': 'rgb(167 139 250 / 0.45)',

  'chat-canvas-bg': '#ede9fe',
  'chat-canvas-text': '#4c1d95',
  'chat-user-bg': '#ddd6fe',
  'chat-user-text': '#4c1d95',
  'chat-user-border': '#a78bfa',
  'chat-assistant-bg': '#f5f3ff',
  'chat-assistant-text': '#5b21b6',
  'chat-assistant-border': '#c4b5fd',
  'chat-log-bg': '#faf5ff',
  'chat-tabs-bar-bg': '#ede9fe',
  'chat-tab-active-bg': '#7c3aed',
  'chat-tab-inactive-bg': 'rgb(124 58 237 / 0.15)',
  'chat-tab-border': '#8b5cf6',
  'chat-composer-bg': 'rgb(250 245 255 / 0.95)',
  'chat-composer-panel-bg': '#faf5ff',
  'chat-input-border': '#c4b5fd',
  'chat-composer-label-bg': '#ede9fe',
  'chat-mention-command-bg': '#7c3aed',
  'chat-followup-bg': '#faf5ff',
};
