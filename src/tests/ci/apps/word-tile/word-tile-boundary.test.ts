import { describe, expect, test } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Word Tile ownership boundary.
 *
 * Game-specific schemas, tool descriptors and prompt text belong to the app, not
 * to `src/shared`. This pins that: the kit stays game-agnostic, and Word Tile's
 * structural tool is described by the app and merely *registered* by core.
 */

const REPO_ROOT = process.cwd();
const SHARED_DIR = path.join(REPO_ROOT, 'src/shared');
const WORD_TILE_SHARED = path.join(REPO_ROOT, 'src/apps/word-tile/shared');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('word-tile code lives in the app', () => {
  test('src/shared contains no word-tile modules', () => {
    const offenders = walk(SHARED_DIR)
      .filter((f) => /tile-word-grid|word-tile/.test(path.basename(f)))
      .map((f) => path.relative(REPO_ROOT, f));
    expect(offenders).toEqual([]);
  });

  test('the move schema is owned by the app', () => {
    const schema = path.join(WORD_TILE_SHARED, 'tile-word-grid-agent-move-schema.ts');
    expect(() => statSync(schema)).not.toThrow();
  });

  test('the tool descriptor is owned by the app', () => {
    const tool = path.join(WORD_TILE_SHARED, 'agent-tool.ts');
    expect(() => statSync(tool)).not.toThrow();
    const body = readFileSync(tool, 'utf8');
    expect(body).toContain('WORD_TILE_AGENT_TOOL');
    expect(body).toContain('WORD_TILE_AGENT_PURPOSE_SUFFIX');
  });

  test('core only registers descriptors — it does not restate any schema', () => {
    const registry = readFileSync(
      path.join(REPO_ROOT, 'src/backend/ai/structural-tools/platform-structural-tool-registry.ts'),
      'utf8',
    );
    expect(registry).toContain('registerStructuralToolFromApp');
    // The registry is generic: it iterates the app-supplied manifest.
    expect(registry).toContain('GAME_AGENT_TOOLS');
    // No schema may be defined in core.
    expect(registry).not.toContain('TileWordGridAgentMoveSchema');
    expect(registry).not.toContain('z.object');
  });

  test('the app manifest lists every catalogue game with its own descriptor', () => {
    const manifest = readFileSync(
      path.join(REPO_ROOT, 'src/backend/ai/structural-tools/game-agent-tools.ts'),
      'utf8',
    );
    for (const appId of [
      'app-word-tile',
      'app-tic-tac-toe',
      'app-checkers',
      'app-chess',
      'app-connect-four',
      'app-battleship',
      'app-hangman',
      'app-poker-holdem',
    ]) {
      expect(manifest).toContain(appId);
    }
    // Still no schema definitions in core — only imports of app descriptors.
    expect(manifest).not.toContain('z.object');
  });
});
