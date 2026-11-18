import { z } from 'zod';

const optionalNonEmpty = z.string().min(1).optional();

/**
 * Server-side env validation for THE-LAB main backend (rm-46 **5.7**).
 * Warn-only in dev; production profile mismatches are surfaced as warnings (boot does not exit in dev).
 */
export const labServerEnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_PATH: z.string().optional(),
    LAB_PRODUCTION_PROFILE: z.enum(['0', '1', '']).optional(),
    LAB_ALLOWED_ORIGINS: z.string().optional(),
    LAB_APP_SERVICE_TOKEN: optionalNonEmpty,
    LAB_JWT_SECRET: optionalNonEmpty,
    VITE_CONTEXT7_KEY: z.string().optional(),
    CONTEXT7_API_KEY: z.string().optional(),
    VITE_CONTEXT7_BASEURL: z.string().optional(),
    LAB_MCP_TOOL_UI_DELAY_MS: z.string().optional(),
    LAB_CHAT_STREAM_UI_DELAY_MS: z.string().optional(),
    LAB_CHAT_UI_DISPATCH_DELAY_MS: z.string().optional(),
    LAB_CHROMA_ASYNC_WRITE: z.enum(['0', '1', '']).optional(),
    LAB_CHROMA_DEGRADED_OK: z.enum(['0', '1', '']).optional(),
    LAB_STRUCTURED_LOGS: z.enum(['0', '1', 'true', 'false', 'yes', 'no', '']).optional(),
  })
  .passthrough();

export type LabServerEnv = z.infer<typeof labServerEnvSchema>;

export interface LabServerEnvValidationResult {
  ok: boolean;
  warnings: string[];
}

export function validateLabServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): LabServerEnvValidationResult {
  const warnings: string[] = [];
  const parsed = labServerEnvSchema.safeParse(env);
  if (!parsed.success) {
    warnings.push(`Env schema parse issues: ${parsed.error.message}`);
  }

  if (env.LAB_PRODUCTION_PROFILE === '1') {
    if (!env.LAB_ALLOWED_ORIGINS?.trim()) {
      warnings.push('LAB_PRODUCTION_PROFILE=1 requires LAB_ALLOWED_ORIGINS (see docs/operations/production-deploy-checklist.md).');
    }
    if (!env.LAB_JWT_SECRET?.trim()) {
      warnings.push('LAB_PRODUCTION_PROFILE=1 should set LAB_JWT_SECRET to a strong secret.');
    }
  }

  if (env.LAB_MCP_TOOL_UI_DELAY_MS !== undefined && env.LAB_MCP_TOOL_UI_DELAY_MS.trim() !== '') {
    const n = parseInt(env.LAB_MCP_TOOL_UI_DELAY_MS, 10);
    if (Number.isNaN(n) || n < 0) {
      warnings.push('LAB_MCP_TOOL_UI_DELAY_MS must be a non-negative integer.');
    }
  }

  for (const key of ['LAB_CHAT_STREAM_UI_DELAY_MS', 'LAB_CHAT_UI_DISPATCH_DELAY_MS'] as const) {
    const raw = env[key];
    if (raw !== undefined && raw.trim() !== '') {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n) || n < 0) {
        warnings.push(`${key} must be a non-negative integer.`);
      }
    }
  }

  return { ok: warnings.length === 0, warnings };
}

export function logLabServerEnvWarnings(
  env: NodeJS.ProcessEnv = process.env,
  options?: { logger?: Pick<Console, 'warn'> },
): LabServerEnvValidationResult {
  const result = validateLabServerEnv(env);
  const log = options?.logger ?? console;
  for (const warning of result.warnings) {
    log.warn(`[LAB-ENV] ${warning}`);
  }
  return result;
}
