import { labAppFetch } from '@/shared/composables/useLabUserHeaders';

/** POST published form data to Forms Builder (rm-46 **3.4** / shared submit). */
export interface FormsBuilderSubmissionResult {
  success: boolean;
  message?: string;
  submissionId?: string | number;
}

export async function submitFormToFormsBuilder(
  formsBuilderUrl: string,
  formKey: string,
  data: Record<string, unknown>,
): Promise<FormsBuilderSubmissionResult> {
  const base = formsBuilderUrl.replace(/\/$/, '');
  const response = await labAppFetch(`${base}/api/v1/forms/submit/${encodeURIComponent(formKey)}`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.error ?? body.message ?? `Submission failed: ${response.status}`);
  }

  return (await response.json()) as FormsBuilderSubmissionResult;
}
