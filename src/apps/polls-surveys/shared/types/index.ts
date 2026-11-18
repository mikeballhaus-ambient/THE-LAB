export type PollKind = 'single' | 'multi';
export type PollStatus = 'draft' | 'open' | 'closed';

export interface Poll {
  id: number;
  question: string;
  kind: PollKind;
  status: PollStatus;
  allowAnonymous: boolean;
  /** When false, each voter may cast at most one vote row on this poll. */
  allowMultipleVotes: boolean;
  createdAt: string;
}

export interface PollOption {
  id: number;
  pollId: number;
  label: string;
  order: number;
}

/** Option with its tallied vote count. */
export interface PollOptionResult extends PollOption {
  votes: number;
}

/** Poll with its options, per-option tallies, and total votes cast. */
export interface PollWithResults extends Poll {
  options: PollOptionResult[];
  totalVotes: number;
  /** Set on list when the viewer already voted and multiple votes are disallowed. */
  viewerHasVoted?: boolean;
}

export interface UpsertPollInput {
  question: string;
  kind: PollKind;
  status: PollStatus;
  allowAnonymous: boolean;
  allowMultipleVotes: boolean;
}

export interface UpsertOptionInput {
  pollId: number;
  label: string;
}

export interface CastVoteInput {
  pollId: number;
  optionId: number;
  voter: string;
  /** Platform user id for the voter (phase 31, non-entity table). */
  voterId?: number | null;
}

export interface PollListViewerContext {
  voter: string;
  voterId: number | null;
}
