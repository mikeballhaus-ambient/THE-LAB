import { describe, test, expect } from '@jest/globals';
import { zodToolParamsToJsonSchema } from '@/shared/utils/mcp-tool-json-schema';
import { TileWordGridAgentMoveSchema } from '@/apps/word-tile/shared/tile-word-grid-agent-move-schema';

describe('zodToolParamsToJsonSchema', () => {
  test('flattens Tile Word Grid move schema (ZodEffects + fields without breaking on missing describe-only bug)', () => {
    const schema = zodToolParamsToJsonSchema(TileWordGridAgentMoveSchema);
    expect(schema.type).toBe('object');
    expect(schema.required).toContain('type');
    expect(schema.properties.type).toMatchObject({
      type: 'string',
      enum: ['place', 'pass', 'exchange', 'resign'],
    });
    expect(schema.properties.placements).toMatchObject({
      type: 'array',
    });
    const placementItems = (schema.properties.placements as { items?: { properties?: Record<string, unknown> } })
      .items;
    expect(placementItems?.properties).toMatchObject({
      row: { type: 'number' },
      col: { type: 'number' },
      letter: { type: 'string' },
    });
    expect(schema.properties.letters).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    });
  });
});
