import { z } from 'zod';

function zodFieldDescription(field: z.ZodTypeAny): string | undefined {
  const direct = field.description;
  if (direct) {
    return direct;
  }
  const defDesc = (field as { _def?: { description?: string } })._def?.description;
  return defDesc || undefined;
}

/** Unwrap `.superRefine()` / `.transform()` so tool params flatten to the inner object shape (Zod 3 + 4). */
export function unwrapZodToolParams(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current: z.ZodTypeAny = schema;
  for (let depth = 0; depth < 12; depth++) {
    const shape = (current as z.ZodObject<z.ZodRawShape>).shape;
    if (shape && typeof shape === 'object') {
      return current;
    }
    const innerTypeFn = (current as { innerType?: () => z.ZodTypeAny }).innerType;
    if (typeof innerTypeFn === 'function') {
      const next = innerTypeFn.call(current);
      if (next === current) {
        break;
      }
      current = next;
      continue;
    }
    break;
  }
  return current;
}

type ToolParamsJsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
  discriminator?: string;
};

/** JSON Schema `parameters` object for OpenAI-style tool definitions. */
export function zodToolParamsToJsonSchema(params: z.ZodTypeAny): ToolParamsJsonSchema {
  const inner = unwrapZodToolParams(params);
  return flattenZodObject(inner);
}

/** Shared Zod → JSON Schema for MCP tools (rm-46 **2.16**). */
export function flattenZodObject(schema: z.ZodTypeAny): ToolParamsJsonSchema {
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = schema.options as z.ZodObject<z.ZodRawShape>[];
    const allProperties: Record<string, unknown> = {};
    const allRequired: string[][] = [];

    for (const option of options) {
      const flattened = flattenZodObject(option as z.ZodObject<z.ZodRawShape>);
      for (const key in flattened.properties) {
        if (!allProperties.hasOwnProperty(key)) {
          allProperties[key] = flattened.properties[key];
        } else {
          const existing = allProperties[key] as Record<string, unknown>;
          const newProp = flattened.properties[key] as Record<string, unknown>;
          if (existing.enum && newProp.enum) {
            allProperties[key] = {
              ...existing,
              enum: [
                ...new Set([
                  ...(existing.enum as unknown[]),
                  ...(newProp.enum as unknown[]),
                ]),
              ],
            };
          } else if (!newProp.enum && !existing.enum && key === 'discriminator') {
            allProperties[key] = newProp;
          }
        }
      }
      allRequired.push(flattened.required);
    }

    const flatRequired: string[] = [];
    const seen = new Set<string>();
    for (const req of allRequired.flat()) {
      if (!seen.has(req)) {
        flatRequired.push(req);
        seen.add(req);
      }
    }

    const discriminator =
      (schema as { _def?: { discriminator?: string } })._def?.discriminator || 'operation';
    return {
      type: 'object' as const,
      properties: allProperties,
      required: flatRequired,
      ...(discriminator ? { discriminator } : {}),
    };
  }

  if (!(schema instanceof z.ZodObject)) {
    return { type: 'object', properties: {}, required: [] };
  }

  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const key in shape) {
    let field = shape[key] as z.ZodTypeAny;
    let isOptional = false;
    let isNullable = false;
    let hasDefault = false;

    if (field instanceof z.ZodOptional) {
      isOptional = true;
      field = field.unwrap() as z.ZodTypeAny;
    }
    if (field instanceof z.ZodNullable) {
      isNullable = true;
      field = field.unwrap() as z.ZodTypeAny;
    }
    if (field instanceof z.ZodDefault) {
      hasDefault = true;
      field = field.unwrap() as z.ZodTypeAny;
    }

    const description = zodFieldDescription(field);
    properties[key] = {
      ...convertZodType(field),
      ...(description ? { description } : {}),
    };
    if (!isOptional && !isNullable && !hasDefault) {
      required.push(key);
    }
  }

  return { type: 'object' as const, properties, required };
}

export function convertZodType(field: z.ZodTypeAny): Record<string, unknown> {
  if (field instanceof z.ZodLiteral) {
    const literalValue = field.value;
    return {
      type: typeof literalValue === 'string' ? 'string' : typeof literalValue,
      enum: [literalValue],
    };
  }
  if (field instanceof z.ZodEnum) {
    const values = Array.isArray(field.def.entries)
      ? field.def.entries
      : Object.values(field.def.entries);
    return { type: 'string', enum: values };
  }
  if (field instanceof z.ZodString) return { type: 'string' };
  if (field instanceof z.ZodNumber) return { type: 'number' };
  if (field instanceof z.ZodBoolean) return { type: 'boolean' };
  if (field instanceof z.ZodArray) {
    const arr = field as z.ZodArray<z.ZodTypeAny>;
    const inner =
      (arr as { element?: z.ZodTypeAny }).element ??
      (
        arr as unknown as {
          _def?: { type?: z.ZodTypeAny; element?: z.ZodTypeAny };
        }
      )._def?.element ??
      (arr as unknown as { _def?: { type?: z.ZodTypeAny } })._def?.type;
    return { type: 'array', items: inner ? convertZodType(inner) : {} };
  }
  if (field instanceof z.ZodObject) return flattenZodObject(field);
  if (field instanceof z.ZodUnion) return {};
  if (field instanceof z.ZodLazy) return {};
  if (field instanceof z.ZodDefault) {
    const inner = field.removeDefault() as z.ZodTypeAny;
    return convertZodType(inner);
  }
  if (field instanceof z.ZodCatch) {
    const inner = (field as z.ZodCatch<z.ZodTypeAny>).removeCatch();
    return convertZodType(inner);
  }
  return {};
}
