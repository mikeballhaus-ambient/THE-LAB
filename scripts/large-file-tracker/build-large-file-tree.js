#!/usr/bin/env node

/**
 * Wrapper script to call build-tree.js with correct arguments
 * Run from project root: node scripts/large-file-tracker/build-large-file-tree.js
 */

import { execSync } from 'child_process';

// Default paths (relative to project root)
const BUILD_TREE_SCRIPT = 'scripts/build-tree.js';
const DEFAULT_REFACTOR_DIR = 'docs/large-file-refactor';
const DEFAULT_OUTPUT_FILE = 'docs/large-file-refactor/documentation-tree.md';

/**
 * Main function
 */
function main() {
    try {
        // Run build-tree.js with arguments
        const command = `node ${BUILD_TREE_SCRIPT} ${DEFAULT_REFACTOR_DIR} ${DEFAULT_OUTPUT_FILE}`;
        
        console.log('Running: ' + command);
        execSync(command, { stdio: 'inherit' });
        
    } catch (error) {
        console.error('Error running build-tree.js:', error.message);
        process.exit(1);
    }
}

main();
