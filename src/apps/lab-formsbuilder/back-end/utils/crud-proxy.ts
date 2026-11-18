import type { FormBuilderContractActionItem } from '@/shared/types';

export function resolveEndpointUrl(
  baseUrl: string,
  actionPath: string,
  pathParams?: Record<string, string | number>
): string {
  let path = actionPath;
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function executeCrudAction(
  baseUrl: string,
  action: FormBuilderContractActionItem,
  body?: unknown,
  pathParams?: Record<string, string | number>,
  forwardHeaders?: Record<string, string>,
): Promise<{ status: number; data: unknown }> {
  const axiosModule = await import('axios');
  const url = resolveEndpointUrl(baseUrl, action.url, pathParams);
  const response = await axiosModule.default.request({
    url,
    method: action.type,
    data: body,
    headers: forwardHeaders,
    timeout: 10000,
    validateStatus: () => true,
  });
  return { status: response.status, data: response.data };
}
