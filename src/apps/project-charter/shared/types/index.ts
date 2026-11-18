export type CharterStatus = 'draft' | 'active' | 'on-hold' | 'complete';

export interface Charter {
  id: number;
  title: string;
  sponsor: string;
  /** Platform user id for the sponsor (phase 31). */
  sponsorId?: number | null;
  purpose: string;
  scope: string;
  outOfScope: string;
  stakeholders: string;
  /** Platform user ids for multiselect round-trip (JSON array in SQLite). */
  stakeholderUserIds?: string | null;
  /** Platform user id for the lead stakeholder (phase 31). */
  stakeholdersOwnerId?: number | null;
  goals: string;
  status: CharterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCharterInput {
  title: string;
  sponsor: string;
  sponsorId?: number | null;
  purpose: string;
  scope: string;
  outOfScope: string;
  stakeholders: string;
  stakeholderUserIds?: string | null;
  stakeholdersOwnerId?: number | null;
  goals: string;
  status: CharterStatus;
}
