import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — deep violet shell with bright purple accents. */
export const MIDNIGHT_VIOLET_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#4c1d95',
  'general-border': '#a78bfa',

  'button-bg': '#7c3aed',
  'button-text': '#faf5ff',
  'button-border': '#8b5cf6',
  'button-bg-hover': '#8b5cf6',
  'button-border-hover': '#a78bfa',
  'button-outlined-text': '#c4b5fd',
  'button-outlined-border': '#a78bfa',
  'button-outlined-bg-hover': '#5b21b6',
  'button-outlined-text-hover': '#faf5ff',

  'card-gradient-stop-1': 'rgb(124 58 237 / 0.5)',
  'card-gradient-stop-2': 'rgb(91 33 182 / 0.55)',
  'card-gradient-stop-3': 'rgb(76 29 149 / 0.7)',
  'card-border': 'rgb(167 139 250 / 0.35)',
  'card-border-hover': 'rgb(196 181 253 / 0.45)',
  'card-title-text': '#ede9fe',
  'card-icon-bg': 'rgb(124 58 237 / 0.45)',
  'card-icon-border': 'rgb(167 139 250 / 0.4)',

  'chat-canvas-bg': '#4c1d95',
  'chat-user-bg': '#6d28d9',
  'chat-user-text': '#faf5ff',
  'chat-assistant-bg': '#5b21b6',
  'chat-assistant-text': '#ede9fe',
  'chat-log-bg': '#5b21b6',
  'chat-tool-result-bg': '#1e1b4b',
  'chat-thinking-bg': 'rgb(124 58 237 / 0.35)',
  'chat-tabs-bar-bg': '#4c1d95',
  'chat-tab-active-bg': '#7c3aed',
  'chat-tab-inactive-bg': 'rgb(139 92 246 / 0.22)',
  'chat-tab-text': '#faf5ff',
  'chat-tab-border': '#a78bfa',
  'chat-composer-bg': 'rgb(91 33 182 / 0.65)',
  'chat-composer-panel-bg': '#5b21b6',
  'chat-input-bg': '#6d28d9',
  'chat-mention-command-bg': '#7c3aed',
  'chat-followup-bg': '#5b21b6',

  'prime-surface-700': '#7c3aed',
  'prime-surface-800': '#6d28d9',
  'prime-surface-900': '#5b21b6',
  'prime-surface-950': '#4c1d95',
  'prime-primary-500': '#a78bfa',
  'prime-primary-600': '#8b5cf6',
};
