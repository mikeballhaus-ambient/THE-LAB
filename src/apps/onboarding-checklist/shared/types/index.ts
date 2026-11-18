export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Checklist {
  id: number;
  newHire: string;
  /** Platform user id for the new hire (phase 31). */
  newHireId?: number | null;
  role: string;
  startDate: string;
  createdAt: string;
}

export interface ChecklistTask {
  id: number;
  checklistId: number;
  title: string;
  owner: string;
  /** Platform user id for the task owner (phase 31). */
  ownerId?: number | null;
  /** Calendar due date (`YYYY-MM-DD`); empty when unset. */
  dueDate: string;
  status: TaskStatus;
  order: number;
}

/** Checklist with its tasks and the derived completion percentage (0–100). */
export interface ChecklistWithTasks extends Checklist {
  tasks: ChecklistTask[];
  /**
   * Percentage of tasks marked `done`, computed server-side in
   * `OnboardingRepository.list()` (`Math.round(done / tasks.length * 100)`, `0` when empty).
   * Always present on list responses — do not recompute it in the UI, or the two can disagree.
   */
  progress: number;
}

export interface UpsertChecklistInput {
  newHire: string;
  newHireId?: number | null;
  role: string;
  startDate: string;
}

export interface UpsertTaskInput {
  checklistId: number;
  title: string;
  owner: string;
  ownerId?: number | null;
  dueDate?: string;
  status: TaskStatus;
}
