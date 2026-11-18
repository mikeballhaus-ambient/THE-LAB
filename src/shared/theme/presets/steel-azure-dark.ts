import { CLOUD_GREY_DARK_TOKENS } from '@/shared/theme/presets/cloud-grey-dark';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Dark — blue-steel surfaces with azure primary. */
export const STEEL_AZURE_DARK_TOKENS: LabThemeTokenMap = {
  ...CLOUD_GREY_DARK_TOKENS,

  'general-bg': '#1e3a8a',
  'general-border': '#60a5fa',

  'button-bg': '#2563eb',
  'button-text': '#eff6ff',
  'button-border': '#3b82f6',
  'button-bg-hover': '#3b82f6',
  'button-border-hover': '#60a5fa',
  'button-outlined-text': '#93c5fd',
  'button-outlined-border': '#60a5fa',
  'button-outlined-bg-hover': '#1e40af',
  'button-outlined-text-hover': '#eff6ff',

  'card-gradient-stop-1': 'rgb(30 58 138 / 0.85)',
  'card-gradient-stop-2': 'rgb(30 64 175 / 0.55)',
  'card-gradient-stop-3': 'rgb(30 58 138 / 0.7)',
  'card-border': 'rgb(96 165 250 / 0.35)',
  'card-border-hover': 'rgb(147 197 253 / 0.45)',
  'card-title-text': '#f8fafc',
  'card-icon-bg': 'rgb(37 99 235 / 0.45)',
  'card-icon-border': 'rgb(96 165 250 / 0.4)',

  'chat-canvas-bg': '#1e3a8a',
  'chat-user-bg': '#1d4ed8',
  'chat-user-text': '#eff6ff',
  'chat-assistant-bg': '#1e40af',
  'chat-assistant-text': '#dbeafe',
  'chat-log-bg': '#1e40af',
  'chat-tool-result-bg': '#0f172a',
  'chat-thinking-bg': 'rgb(37 99 235 / 0.35)',
  'chat-tabs-bar-bg': '#1e3a8a',
  'chat-tab-active-bg': '#2563eb',
  'chat-tab-inactive-bg': 'rgb(59 130 246 / 0.22)',
  'chat-tab-text': '#eff6ff',
  'chat-tab-border': '#60a5fa',
  'chat-composer-bg': 'rgb(30 64 175 / 0.65)',
  'chat-composer-panel-bg': '#1e40af',
  'chat-input-bg': '#1d4ed8',
  'chat-mention-command-bg': '#2563eb',
  'chat-followup-bg': '#1e40af',

  'prime-surface-700': '#2563eb',
  'prime-surface-800': '#1d4ed8',
  'prime-surface-900': '#1e40af',
  'prime-surface-950': '#1e3a8a',
  'prime-primary-500': '#60a5fa',
  'prime-primary-600': '#3b82f6',
};
