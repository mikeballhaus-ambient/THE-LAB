export type SuggestionStatus = 'open' | 'planned' | 'in-progress' | 'done' | 'declined';

export interface Suggestion {
  id: number;
  title: string;
  body: string;
  author: string;
  /** Platform user id of the author (catalog person column, phase 31). */
  authorId?: number | null;
  status: SuggestionStatus;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSuggestionInput {
  title: string;
  body: string;
  author: string;
  authorId?: number | null;
  status: SuggestionStatus;
}
