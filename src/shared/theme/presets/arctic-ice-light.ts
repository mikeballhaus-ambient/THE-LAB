import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — crisp arctic ice, cool blue-grey text. */
export const ARCTIC_ICE_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#f8fafc',
  'general-text': '#1e3a8a',
  'general-text-muted': '#1d4ed8',
  'general-border': '#cbd5e1',

  'button-bg': '#1d4ed8',
  'button-text': '#f8fafc',
  'button-border': '#2563eb',
  'button-bg-hover': '#1e40af',
  'button-border-hover': '#1d4ed8',
  'button-outlined-text': '#1d4ed8',
  'button-outlined-border': '#60a5fa',
  'button-outlined-bg-hover': '#eff6ff',
  'button-outlined-text-hover': '#1e3a8a',

  'card-gradient-stop-1': 'rgb(241 245 249 / 0.98)',
  'card-gradient-stop-2': 'rgb(226 232 240 / 0.95)',
  'card-gradient-stop-3': 'rgb(191 219 254 / 0.35)',
  'card-border': 'rgb(59 130 246 / 0.3)',
  'card-border-hover': 'rgb(37 99 235 / 0.4)',
  'card-title-text': '#1e40af',
  'card-icon-bg': 'rgb(239 246 255 / 0.95)',
  'card-icon-border': 'rgb(147 197 253 / 0.5)',

  'chat-canvas-bg': '#f1f5f9',
  'chat-canvas-text': '#1e3a8a',
  'chat-user-bg': '#dbeafe',
  'chat-user-text': '#1e3a8a',
  'chat-user-border': '#93c5fd',
  'chat-assistant-bg': '#f8fafc',
  'chat-assistant-text': '#1e40af',
  'chat-assistant-border': '#bfdbfe',
  'chat-log-bg': '#f8fafc',
  'chat-tabs-bar-bg': '#f1f5f9',
  'chat-tab-active-bg': '#1d4ed8',
  'chat-tab-inactive-bg': 'rgb(29 78 216 / 0.12)',
  'chat-tab-border': '#2563eb',
  'chat-composer-bg': 'rgb(248 250 252 / 0.98)',
  'chat-composer-panel-bg': '#f8fafc',
  'chat-input-border': '#93c5fd',
  'chat-composer-label-bg': '#f1f5f9',
  'chat-mention-command-bg': '#1d4ed8',
  'chat-followup-bg': '#f8fafc',
};
