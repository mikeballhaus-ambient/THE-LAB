/**
 * Wrapper script for running Jest tests by file path (supports partial matches)
 * Usage: node scripts/test.js "src/tests/foo"
 *        node scripts/test.js "parseToolCall"
 */

import { execSync } from 'node:child_process';

const pattern = process.argv[2];

if (!pattern) {
  console.error('Usage: node scripts/test.js "<partial file path>"');
  process.exit(1);
}

try {
  const output = execSync(
    `node --experimental-vm-modules node_modules/jest/bin/jest.js -- "${pattern}"`,
    {
      cwd: process.cwd(),
      encoding: 'utf-8'
    }
  );
  console.log(output); 
} catch (error) {
  process.exit(error.status || 1);
}
