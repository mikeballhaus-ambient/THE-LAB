import { SLATE_LAB_LIGHT_TOKENS } from '@/shared/theme/presets/slate-lab-light';
import type { LabThemeTokenMap } from '@/shared/theme/lab-theme-token-keys';

/** Light — airy sky blue page with deep sky text. */
export const SKY_DAYLIGHT_LIGHT_TOKENS: LabThemeTokenMap = {
  ...SLATE_LAB_LIGHT_TOKENS,

  'general-bg': '#f0f9ff',
  'general-text': '#0c4a6e',
  'general-text-muted': '#0369a1',
  'general-border': '#bae6fd',

  'button-bg': '#0284c7',
  'button-text': '#f0f9ff',
  'button-border': '#0ea5e9',
  'button-bg-hover': '#0369a1',
  'button-border-hover': '#0284c7',
  'button-outlined-text': '#0284c7',
  'button-outlined-border': '#38bdf8',
  'button-outlined-bg-hover': '#e0f2fe',
  'button-outlined-text-hover': '#075985',

  'card-gradient-stop-1': 'rgb(224 242 254 / 0.95)',
  'card-gradient-stop-2': 'rgb(186 230 253 / 0.9)',
  'card-gradient-stop-3': 'rgb(125 211 252 / 0.35)',
  'card-border': 'rgb(14 165 233 / 0.35)',
  'card-border-hover': 'rgb(2 132 199 / 0.45)',
  'card-title-text': '#075985',
  'card-icon-bg': 'rgb(224 242 254 / 0.9)',
  'card-icon-border': 'rgb(56 189 248 / 0.45)',

  'chat-canvas-bg': '#e0f2fe',
  'chat-canvas-text': '#0c4a6e',
  'chat-user-bg': '#bae6fd',
  'chat-user-text': '#0c4a6e',
  'chat-user-border': '#38bdf8',
  'chat-assistant-bg': '#dbeafe',
  'chat-assistant-text': '#1e3a8a',
  'chat-assistant-border': '#93c5fd',
  'chat-log-bg': '#f0f9ff',
  'chat-tabs-bar-bg': '#e0f2fe',
  'chat-tab-active-bg': '#0284c7',
  'chat-tab-inactive-bg': 'rgb(2 132 199 / 0.15)',
  'chat-tab-border': '#0ea5e9',
  'chat-composer-bg': 'rgb(240 249 255 / 0.95)',
  'chat-composer-panel-bg': '#f0f9ff',
  'chat-input-border': '#7dd3fc',
  'chat-composer-label-bg': '#e0f2fe',
  'chat-mention-command-bg': '#0284c7',
  'chat-followup-bg': '#f0f9ff',
};
