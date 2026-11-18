import { describe, expect, test } from '@jest/globals';
import {
  buildMcpToolsSection,
  formatUserInstructionsAppendix,
  stripRedundantInstructionBlocks,
} from '@/shared/config/lab-system-prompt';

describe('lab-system-prompt', () => {
  test('buildMcpToolsSection omits tool id list when native API tools are off', () => {
    const section = buildMcpToolsSection(['read_file', 'list_files'], false);
    expect(section).toContain('2 MCP tools');
    expect(section).not.toContain('read_file');
    expect(section).toContain('ACTIVE APPS');
  });

  test('formatUserInstructionsAppendix strips duplicate neural memory blocks', () => {
    const noisy = `Custom rule: be brief.

## NEURAL MEMORY PROTOCOL (MANDATORY)
You MUST call nmem_recall always.

## My actual rules
Always say hello.`;
    const appendix = formatUserInstructionsAppendix(noisy);
    expect(appendix).not.toContain('NEURAL MEMORY PROTOCOL');
    expect(appendix).toContain('My actual rules');
    expect(appendix).toContain('Always say hello');
  });

  test('stripRedundantInstructionBlocks removes pasted CORE BEHAVIOR sections', () => {
    const text = `## CORE BEHAVIOR\n- obey\n\nKeep this line.`;
    expect(stripRedundantInstructionBlocks(text)).toContain('Keep this line');
    expect(stripRedundantInstructionBlocks(text)).not.toContain('CORE BEHAVIOR');
  });
});
