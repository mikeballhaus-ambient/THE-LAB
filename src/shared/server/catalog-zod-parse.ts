import { z } from 'zod';

/** Forms Builder self-entity lookups submit Select values as strings; connector bodies need integers. */
export const catalogPositiveInt = z.coerce.number().int().positive();

export function catalogZodParse<T extends z.ZodType>(schema: T) {
  return (body: Record<string, unknown>): z.infer<T> => {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }
    return parsed.data;
  };
}
