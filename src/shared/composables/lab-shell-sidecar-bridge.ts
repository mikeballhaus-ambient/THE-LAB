import type { LabSidecarToolProfile } from '@/shared/types/lab-sidecar-view-context';
import type { ChatPersona } from '@/shared/types';

/** Chat persona for wizard handoff — Chat persona cannot scaffold (`app_management_create_app` disallowed). */
export const LAB_APP_BUILDER_CONSULTATION_PERSONA: ChatPersona = 'Code';

/** Sidecar companion during vs–Lab Assistant play — always Chat persona (not Code/Orchestrator). */
export const LAB_GAME_SIDECAR_PERSONA: ChatPersona = 'Chat';

import type { LabAssistantBanterRequest } from '@/shared/game-platform/lab-assistant-banter/types';

export interface LabShellSidecarConsultationRequest {
  message: string;
  sessionTitle?: string;
  toolProfile?: LabSidecarToolProfile;
  persona?: ChatPersona;
  /** When set, server stashes primary catalog tag for the next `create_app` if the model omits `catalogTagIds`. */
  primaryCatalogTagId?: string;
  primaryCatalogTagLabel?: string;
}

export interface LabShellSidecarGameSessionRequest {
  /** Short title for the new Dexie session tab, e.g. "Chess vs Lab Assistant". */
  sessionTitle: string;
  gameId: string;
  matchId: string;
  difficulty?: string;
}

export interface LabShellSidecarBridge {
  startConsultation(request: LabShellSidecarConsultationRequest): Promise<void>;
  /** Chat persona Sidecar for vs–Lab Assistant play — reuses one Dexie tab per gameId when present. */
  startGameSidecarSession?(request: LabShellSidecarGameSessionRequest): Promise<void>;
  /** Template Sidecar line during play (Sidecar expanded, active game session). */
  postGameBanter?(request: LabAssistantBanterRequest): Promise<void>;
}

let bridge: LabShellSidecarBridge | null = null;

export function registerLabShellSidecarBridge(api: LabShellSidecarBridge): void {
  bridge = api;
}

export function getLabShellSidecarBridge(): LabShellSidecarBridge | null {
  return bridge;
}
