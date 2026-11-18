/** Hiring pipeline stage for an applicant. */
export type HiringStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

export interface Applicant {
  id: number;
  name: string;
  role: string;
  email: string;
  stage: HiringStage;
  notes: string;
  /** Platform user id of the person (catalog person-column, phase 31). */
  ownerId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertApplicantInput {
  name: string;
  role: string;
  email: string;
  stage: HiringStage;
  notes: string;
}
