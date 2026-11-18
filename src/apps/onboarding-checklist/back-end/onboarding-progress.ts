/**
 * Checklist completion is derived, not stored.
 *
 * No route marks a *checklist* complete — tasks close one at a time. "Completed" therefore means
 * every task in the set is `done`, and the publisher compares this before and after a task-status
 * write so a re-saved `done` task does not re-fire the event.
 *
 * Kept out of `server.ts` so the rule can be unit-tested without booting an app server.
 */
export interface ChecklistTaskStatus {
  status: string;
}

export function isChecklistComplete(tasks: readonly ChecklistTaskStatus[]): boolean {
  // An empty checklist is not "complete" — it has nothing to complete.
  return tasks.length > 0 && tasks.every((task) => task.status === 'done');
}
