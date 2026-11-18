import { z } from 'zod';

/** JSON boolean for MCP tools; coerces common model mistakes (`"true"` / `"false"` strings). */
const integrationStubBoolean = (defaultValue: boolean, description: string) =>
  z.coerce.boolean().optional().default(defaultValue).describe(description);

export const ProvisionFormStubRequestSchema = z.object({
  hostAppId: z.string().min(1),
  serviceId: z.string().min(1),
  slot: z.string().min(1),
  suggestedFormKey: z.string().min(1).optional(),
  publish: integrationStubBoolean(
    true,
    'Publish the stub form after provision (default true). JSON boolean, not a string.',
  ),
  overwrite: integrationStubBoolean(
    false,
    'Replace an existing stub for the same slot (use true after binding reset or connector model changes). JSON boolean, not a string.',
  ),
});

export type ProvisionFormStubRequest = z.infer<typeof ProvisionFormStubRequestSchema>;

export function parseProvisionFormStubRequest(input: unknown): ProvisionFormStubRequest {
  return ProvisionFormStubRequestSchema.parse(input);
}

export const ProvisionChartStubRequestSchema = ProvisionFormStubRequestSchema.extend({
  suggestedChartKey: z.string().min(1).optional(),
  chartType: z.enum(['bar', 'line', 'pie', 'doughnut', 'funnel']).optional(),
});

export type ProvisionChartStubRequest = z.infer<typeof ProvisionChartStubRequestSchema>;

export function parseProvisionChartStubRequest(input: unknown): ProvisionChartStubRequest {
  return ProvisionChartStubRequestSchema.parse(input);
}
