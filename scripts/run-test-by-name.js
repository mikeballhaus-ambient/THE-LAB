/**
 * Wrapper script for running Jest tests with test name pattern
 * Usage: node scripts/run-test-by-name.js "Test pattern name"
 */

import { execSync } from 'node:child_process';

const pattern = process.argv[2];

if (!pattern) {
  console.error('Usage: node scripts/run-test-by-name.js "Test pattern name"');
  process.exit(1);
}

try {
  const output = execSync(
    `node --experimental-vm-modules node_modules/jest/bin/jest.js --testNamePattern="${pattern}"`,
    {
      cwd: process.cwd(),
      encoding: 'utf-8'
    }
  );
  console.log(output); 
} catch (error) {
  process.exit(error.status || 1);
}
