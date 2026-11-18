/** Suggested task titles when creating work from a sales pipeline stage (manual UX; not auto-created). */
export const SALES_PIPELINE_TASK_SUGGESTIONS: Record<string, { title: string }[]> = {
  qualification: [{ title: 'Qualify opportunity' }],
  proposal: [{ title: 'Send proposal' }],
  negotiation: [{ title: 'Follow up on negotiation' }],
  closed_won: [{ title: 'Hand off to delivery' }],
  closed_lost: [{ title: 'Log loss reason' }],
};

export function suggestedTasksForSalesStage(stage: string): { title: string }[] {
  const key = stage.trim().toLowerCase();
  return SALES_PIPELINE_TASK_SUGGESTIONS[key] ?? [];
}
