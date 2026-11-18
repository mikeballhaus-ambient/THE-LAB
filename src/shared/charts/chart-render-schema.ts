import { z } from 'zod';
import { CHART_SIZE_MAX, CHART_SIZE_MIN } from './layout-size';

export const ChartDatasetInputSchema = z.object({
  label: z.string().optional(),
  data: z.array(z.number()),
  backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
  borderColor: z.union([z.string(), z.array(z.string())]).optional(),
  fill: z.union([z.boolean(), z.string()]).optional(),
});

export const ChartDataPayloadSchema = z.object({
  labels: z.array(z.string()).optional(),
  datasets: z.array(ChartDatasetInputSchema).min(1),
});

export const ChartRenderRequestSchema = z
  .object({
    data: ChartDataPayloadSchema.optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    size: z.number().min(CHART_SIZE_MIN).max(CHART_SIZE_MAX).optional(),
    optionsOverride: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.data && !value.context) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either data or context is required',
      });
    }
  });

export type ChartRenderRequestInput = z.infer<typeof ChartRenderRequestSchema>;
